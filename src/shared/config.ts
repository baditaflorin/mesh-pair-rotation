export const appConfig = {
  appName: "mesh-pair-rotation",
  storagePrefix: "mesh-pair-rotation",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
  repositoryUrl: "https://github.com/baditaflorin/mesh-pair-rotation",
  pagesUrl: "https://baditaflorin.github.io/mesh-pair-rotation/",
  signalingUrl:
    (import.meta.env.VITE_WEBRTC_SIGNALING as string | undefined) ?? "wss://turn.0docker.com/ws",
  turnTokenUrl:
    (import.meta.env.VITE_TURN_TOKEN_URL as string | undefined) ??
    "https://turn.0docker.com/credentials",
  paypalUrl: "https://www.paypal.com/paypalme/florinbadita",
} as const;
