import React, { useRef, useState, useEffect, useCallback } from "react";
import Peer from "peerjs";

interface CallUser {
  _id: string;
  name?: string;
  image?: string;
  username?: string;
}

interface CallData {
  _id: string;
  callType: "audio" | "video";
  status: string;
  callerId: string;
  receiverId: string;
  otherUser: CallUser | null;
  isCaller: boolean;
}

interface VideoCallProps {
  call: CallData;
  currentUserId: string;
  onEndCall: (callId: string) => void;
  onAnswerCall: (callId: string) => void;
  onRejectCall: (callId: string) => void;
  onClose: () => void;
}

export function VideoCall({ call, currentUserId, onEndCall, onAnswerCall, onRejectCall, onClose }: VideoCallProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callStatus, setCallStatus] = useState<string>(call.status);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(call.callType === "video");
  const [peerError, setPeerError] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const peerCallRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const otherUser = call.otherUser;
  const isCaller = call.isCaller;

  // Play ringing/vibrating sound for incoming calls
  useEffect(() => {
    if (callStatus === "ringing") {
      // Play a subtle ringing tone using Web Audio API
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 440;
        gain.gain.value = 0.1;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        // Pulsing effect
        let pulse = 0;
        const pulseInterval = setInterval(() => {
          pulse = pulse === 0 ? 1 : 0;
          gain.gain.value = pulse * 0.1;
        }, 500);
        audioRef.current = { ctx, osc, gain } as any;
        return () => {
          clearInterval(pulseInterval);
          osc.stop();
          ctx.close();
        };
      } catch {}
    }
  }, [callStatus]);

  // Track call duration
  useEffect(() => {
    if (callStatus === "active") {
      durationIntervalRef.current = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    }
    return () => {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    };
  }, [callStatus]);

  // Format duration as mm:ss
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Get user media
  const getMedia = useCallback(async () => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: call.callType === "video",
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err: any) {
      // If video fails, try audio only
      if (call.callType === "video") {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          setLocalStream(stream);
          setIsVideoOn(false);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
          return stream;
        } catch {
          setPeerError("Could not access camera or microphone");
          return null;
        }
      }
      setPeerError("Could not access microphone");
      return null;
    }
  }, [call.callType]);

  // Initialize PeerJS for the caller
  useEffect(() => {
    if (!isCaller || callStatus !== "ringing") return;

    const initPeer = async () => {
      const stream = await getMedia();
      if (!stream) return;

      try {
        const peer = new Peer(currentUserId, {
          debug: 0,
        });

        peer.on("open", (id) => {
          peerRef.current = peer;
        });

        peer.on("error", (err) => {
          console.error("PeerJS error:", err);
          setPeerError("Connection failed. The other user might be offline.");
        });

        // Listen for incoming call (the receiver calls us back)
        peer.on("call", (incomingCall) => {
          peerCallRef.current = incomingCall;
          incomingCall.answer(stream);

          incomingCall.on("stream", (remoteStream) => {
            setRemoteStream(remoteStream);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
            setCallStatus("active");
            onAnswerCall(call._id);
          });

          incomingCall.on("close", () => {
            handleEnd();
          });
        });

        // Try calling the receiver every 2 seconds until they answer
        const retryInterval = setInterval(() => {
          if (peerRef.current && peerRef.current.destroyed) return;
          try {
            const outgoingCall = peer.call(otherUser?._id || call.receiverId, stream);
            if (outgoingCall) {
              peerCallRef.current = outgoingCall;
              setPeerError(null);

              outgoingCall.on("stream", (remoteStream) => {
                setRemoteStream(remoteStream);
                if (remoteVideoRef.current) {
                  remoteVideoRef.current.srcObject = remoteStream;
                }
                setCallStatus("active");
                onAnswerCall(call._id);
                clearInterval(retryInterval);
              });

              outgoingCall.on("close", () => {
                handleEnd();
              });

              outgoingCall.on("error", () => {
                // Will retry
              });
            }
          } catch {}
        }, 2000);

        // Stop retrying after 30 seconds
        setTimeout(() => clearInterval(retryInterval), 30000);

      } catch (err) {
        console.error("Peer init error:", err);
        setPeerError("Could not initialize call");
      }
    };

    initPeer();
  }, [isCaller, callStatus]);

  // Initialize PeerJS for the receiver
  useEffect(() => {
    if (isCaller || callStatus !== "ringing") return;

    const initPeer = async () => {
      const stream = await getMedia();
      if (!stream) return;

      try {
        const peer = new Peer(currentUserId, {
          debug: 0,
        });

        peer.on("open", () => {
          peerRef.current = peer;
        });

        peer.on("error", (err) => {
          console.error("PeerJS error:", err);
          setPeerError("Connection error");
        });

        peer.on("call", (incomingCall) => {
          peerCallRef.current = incomingCall;
          incomingCall.answer(stream);

          incomingCall.on("stream", (remoteStream) => {
            setRemoteStream(remoteStream);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
            setCallStatus("active");
          });

          incomingCall.on("close", () => {
            handleEnd();
          });
        });

        // Also try calling the caller (in case they didn't call us first)
        setTimeout(() => {
          if (!peerCallRef.current && peerRef.current && !peerRef.current.destroyed) {
            try {
              const outgoingCall = peer.call(call.callerId, stream);
              if (outgoingCall) {
                peerCallRef.current = outgoingCall;
                outgoingCall.on("stream", (remoteStream) => {
                  setRemoteStream(remoteStream);
                  if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = remoteStream;
                  }
                  setCallStatus("active");
                });
                outgoingCall.on("close", () => handleEnd());
              }
            } catch {}
          }
        }, 1000);

      } catch (err) {
        console.error("Peer init error:", err);
        setPeerError("Could not initialize call");
      }
    };

    initPeer();
  }, [isCaller, callStatus]);

  const handleEnd = useCallback(() => {
    // Stop all tracks
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    // Close peer connection
    if (peerCallRef.current) {
      peerCallRef.current.close();
    }
    if (peerRef.current) {
      peerRef.current.destroy();
    }
    setLocalStream(null);
    setRemoteStream(null);
    onEndCall(call._id);
  }, [localStream, call._id, onEndCall]);

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream && call.callType === "video") {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  const handleAccept = () => {
    // Create peer as receiver - handled by the useEffect above
    // Just trigger the answer
    onAnswerCall(call._id);
  };

  const handleReject = () => {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    onRejectCall(call._id);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Remote video (full screen) */}
      {callStatus === "active" && remoteStream && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Placeholder when no remote video */}
      {(callStatus !== "active" || !remoteStream) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            {/* Other user avatar */}
            <div className="w-20 h-20 rounded-full bg-white/10 mx-auto mb-4 overflow-hidden">
              {otherUser?.image ? (
                <img src={otherUser.image} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                  {otherUser?.name?.[0]?.toUpperCase() || "U"}
                </div>
              )}
            </div>
            <p className="text-white text-lg font-semibold">{otherUser?.name || "User"}</p>
            <p className="text-white/60 text-sm mt-1">
              {callStatus === "ringing" && (isCaller ? "Ringing..." : "Incoming call...")}
              {callStatus === "active" && "Connecting..."}
              {callStatus === "ended" && "Call ended"}
            </p>
            {peerError && <p className="text-red-400 text-xs mt-2">{peerError}</p>}
          </div>
        </div>
      )}

      {/* Local video (picture-in-picture) */}
      {localStream && (call.callType === "video" || callStatus === "active") && (
        <div className="absolute top-4 right-4 z-10 w-28 h-44 rounded-xl overflow-hidden shadow-lg border-2 border-white/20">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Status header */}
      {callStatus === "active" && (
        <div className="absolute top-4 left-0 right-0 z-10 text-center">
          <p className="text-white/80 text-xs font-mono">{formatDuration(callDuration)}</p>
        </div>
      )}

      {/* Incoming call accept/reject buttons */}
      {callStatus === "ringing" && !isCaller && (
        <div className="absolute bottom-32 left-0 right-0 z-10 flex items-center justify-center gap-8">
          <button
            onClick={handleReject}
            className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
            title="Decline"
          >
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="currentColor">
              <path d="M18.36 17.95c-1.02-1.39-2.36-2.58-3.88-3.55l3.11-3.11c.25-.25.32-.65.17-.98-.44-1.06-1.03-2.12-1.87-3.17-.34-.42-.97-.48-1.39-.11l-2.73 2.3c-.58.49-1.12 1.01-1.6 1.58-.09.11-.17.22-.25.33-.91-.45-1.89-.79-2.91-1.02l-.54-.12c-.44-.1-.88.07-1.11.44l-1.1 1.74c-.24.37-.18.85.13 1.16.83.85 1.8 1.62 2.88 2.28.13.09.27.17.4.26l.2.1c.53.28 1.08.53 1.65.75l-.57.57c-.24.24-.32.6-.19.93.23.56.54 1.13.94 1.69.34.42.97.48 1.39.11l2.73-2.3c.25-.21.34-.55.23-.86-.05-.15-.11-.29-.17-.44.62.24 1.22.53 1.8.86l.15.09c.46.27.86.58 1.2.92.29.29.75.35 1.12.17l1.74-1.1c.37-.23.54-.67.44-1.11-.03-.18-.07-.36-.12-.54z"/>
            </svg>
          </button>
          <button
            onClick={handleAccept}
            className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors shadow-lg"
            title="Accept"
          >
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="currentColor">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.28-.28.67-.36 1.02-.25 1.12.37 2.32.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.75-.25 1.02l-2.2 2.2z"/>
            </svg>
          </button>
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-8 left-0 right-0 z-10 flex items-center justify-center gap-6">
        {callStatus === "ringing" && isCaller && (
          <button
            onClick={handleEnd}
            className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
            title="Cancel"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
              <path d="M18.36 17.95c-1.02-1.39-2.36-2.58-3.88-3.55l3.11-3.11c.25-.25.32-.65.17-.98-.44-1.06-1.03-2.12-1.87-3.17-.34-.42-.97-.48-1.39-.11l-2.73 2.3c-.58.49-1.12 1.01-1.6 1.58-.09.11-.17.22-.25.33-.91-.45-1.89-.79-2.91-1.02l-.54-.12c-.44-.1-.88.07-1.11.44l-1.1 1.74c-.24.37-.18.85.13 1.16.83.85 1.8 1.62 2.88 2.28.13.09.27.17.4.26l.2.1c.53.28 1.08.53 1.65.75l-.57.57c-.24.24-.32.6-.19.93.23.56.54 1.13.94 1.69.34.42.97.48 1.39.11l2.73-2.3c.25-.21.34-.55.23-.86-.05-.15-.11-.29-.17-.44.62.24 1.22.53 1.8.86l.15.09c.46.27.86.58 1.2.92.29.29.75.35 1.12.17l1.74-1.1c.37-.23.54-.67.44-1.11-.03-.18-.07-.36-.12-.54z"/>
            </svg>
          </button>
        )}
        {callStatus === "active" && (
          <>
            {/* Mute toggle */}
            <button
              onClick={toggleMute}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors shadow-lg ${
                isMuted ? "bg-red-500 text-white" : "bg-white/20 text-white hover:bg-white/30"
              }`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-2.87 4.97c-.84-.24-1.62-.64-2.3-1.17l-.01.01L4.27 19l1.27 1.27c1.32.95 2.88 1.55 4.59 1.74v2.99h2v-2.99c1.71-.19 3.27-.79 4.59-1.74L19.73 19l-3.57-3.57c-.01.01-.01.01-.01-.01-.68.53-1.46.93-2.3 1.17-.59.18-1.21.27-1.85.27s-1.26-.09-1.85-.27z"/>
                </svg>
              )}
            </button>
            {/* End call */}
            <button
              onClick={handleEnd}
              className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
              title="End call"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                <path d="M18.36 17.95c-1.02-1.39-2.36-2.58-3.88-3.55l3.11-3.11c.25-.25.32-.65.17-.98-.44-1.06-1.03-2.12-1.87-3.17-.34-.42-.97-.48-1.39-.11l-2.73 2.3c-.58.49-1.12 1.01-1.6 1.58-.09.11-.17.22-.25.33-.91-.45-1.89-.79-2.91-1.02l-.54-.12c-.44-.1-.88.07-1.11.44l-1.1 1.74c-.24.37-.18.85.13 1.16.83.85 1.8 1.62 2.88 2.28.13.09.27.17.4.26l.2.1c.53.28 1.08.53 1.65.75l-.57.57c-.24.24-.32.6-.19.93.23.56.54 1.13.94 1.69.34.42.97.48 1.39.11l2.73-2.3c.25-.21.34-.55.23-.86-.05-.15-.11-.29-.17-.44.62.24 1.22.53 1.8.86l.15.09c.46.27.86.58 1.2.92.29.29.75.35 1.12.17l1.74-1.1c.37-.23.54-.67.44-1.11-.03-.18-.07-.36-.12-.54z"/>
              </svg>
            </button>
            {/* Toggle video */}
            {call.callType === "video" && (
              <button
                onClick={toggleVideo}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors shadow-lg ${
                  !isVideoOn ? "bg-red-500 text-white" : "bg-white/20 text-white hover:bg-white/30"
                }`}
                title={isVideoOn ? "Turn off camera" : "Turn on camera"}
              >
                {isVideoOn ? (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                    <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/>
                  </svg>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
