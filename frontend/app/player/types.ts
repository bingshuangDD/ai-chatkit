export type PlayerAction = "play" | "pause" | "resume" | "stop";

export type PlayerStatus =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "error"
  | "blocked";

export interface PlayableMedia {
  id: string;
  title: string;
  artist: string;
  source_url: string;
  media_type: "audio";
  mime_type?: string | null;
  cover_url?: string | null;
  provider: string;
  expires_at?: string | null;
  playable: boolean;
}

export interface PlayerCommand {
  command_id: string;
  action: PlayerAction;
  media?: PlayableMedia | null;
  message?: string | null;
}

export interface PlayerState {
  status: PlayerStatus;
  currentMedia: PlayableMedia | null;
  error: string | null;
}

