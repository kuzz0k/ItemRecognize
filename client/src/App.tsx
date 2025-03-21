import React, { useEffect, useRef, useState } from "react"
import { io } from "socket.io-client"
import "./App.css"

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [socket, setSocket] = useState<any>(null)
  const [receivedImage, setReceivedImage] = useState<string | null>(null)

  useEffect(() => {
    const ws = io("http://localhost:5000")

    ws.on("connect", () => {
      console.log("[CLIENT] Connected to WebSocket server")
    })

    ws.on("disconnect", () => {
      console.log("[CLIENT] Disconnected from WebSocket server")
    })

    ws.on("receive_frame", (data) => {
      setReceivedImage(data)
    })

    setSocket(ws)
    return () => {
      ws.disconnect()
    }
  }, [])

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        console.log("[CLIENT] Camera started")
      } catch (error) {
        console.error("[CLIENT] Error accessing webcam:", error)
      }
    }
    startCamera()
  }, [])

  const captureFrame = () => {
    if (!videoRef.current || !socket) {
      console.log("[CLIENT] No video or socket connection")
      return
    }

    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d")
    canvas.width = 640
    canvas.height = 480

    context?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
    const imageData = canvas.toDataURL("image/jpeg")

    socket.emit("send_frame", imageData)
  }

  useEffect(() => {
    const interval = setInterval(captureFrame, 300)
    return () => clearInterval(interval)
  }, [socket])

  return (
    <div className="container">
      <div className="video-container">
        <h1>Webcam Stream</h1>
        <video ref={videoRef} autoPlay />
      </div>
      <div className="video-container">
        <h2>Processed Frame:</h2>
        {receivedImage ? (
          <img src={receivedImage} alt="Processed" />
        ) : (
          <p>[CLIENT] Waiting for processed image...</p>
        )}
      </div>
    </div>
  )
}

export default App
