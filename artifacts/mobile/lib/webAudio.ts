export interface WebPlaybackStatus {
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
  didJustFinish: boolean;
}

export type WebStatusCallback = (status: WebPlaybackStatus) => void;

export class WebAudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private statusCallback: WebStatusCallback | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private _volume = 1;

  private emit(extra: Partial<WebPlaybackStatus> = {}): void {
    if (!this.statusCallback) return;
    const a = this.audio;
    if (!a) return;
    this.statusCallback({
      isPlaying: !a.paused && !a.ended,
      positionMillis: (a.currentTime ?? 0) * 1000,
      durationMillis: isNaN(a.duration) ? 0 : a.duration * 1000,
      didJustFinish: false,
      ...extra,
    });
  }

  async load(uri: string, onStatus: WebStatusCallback): Promise<void> {
    await this.unload();
    this.statusCallback = onStatus;

    const audio = new Audio();
    audio.preload = "auto";
    audio.volume = this._volume;
    audio.crossOrigin = "anonymous";
    this.audio = audio;

    audio.addEventListener("ended", () => {
      const dur = isNaN(audio.duration) ? 0 : audio.duration * 1000;
      onStatus({
        isPlaying: false,
        positionMillis: dur,
        durationMillis: dur,
        didJustFinish: true,
      });
    });

    audio.addEventListener("error", (e) => {
      console.warn("[WebAudio] Error loading audio", e);
    });

    audio.src = uri;

    this.pollInterval = setInterval(() => this.emit(), 250);

    try {
      await audio.play();
      this.emit();
    } catch (err) {
      console.warn("[WebAudio] play() failed:", err);
    }
  }

  async play(): Promise<void> {
    try {
      await this.audio?.play();
      this.emit();
    } catch {}
  }

  async pause(): Promise<void> {
    this.audio?.pause();
    this.emit();
  }

  async seek(millis: number): Promise<void> {
    if (this.audio) {
      this.audio.currentTime = millis / 1000;
      this.emit();
    }
  }

  async setVolume(v: number): Promise<void> {
    this._volume = v;
    if (this.audio) this.audio.volume = v;
  }

  async replay(): Promise<void> {
    if (this.audio) {
      this.audio.currentTime = 0;
      await this.audio.play().catch(() => {});
      this.emit();
    }
  }

  async unload(): Promise<void> {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
      this.audio = null;
    }
    this.statusCallback = null;
  }
}
