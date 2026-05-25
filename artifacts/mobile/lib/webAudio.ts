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
  private _rate = 1;

  private emit(extra: Partial<WebPlaybackStatus> = {}): void {
    if (!this.statusCallback || !this.audio) return;
    const a = this.audio;
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
    // DO NOT set crossOrigin — blob: URLs have no CORS headers and
    // setting crossOrigin causes the browser to block them.
    audio.preload = "auto";
    audio.volume = this._volume;
    audio.playbackRate = this._rate;
    this.audio = audio;

    audio.addEventListener("ended", () => {
      const dur = isNaN(audio.duration) ? 0 : audio.duration * 1000;
      onStatus({ isPlaying: false, positionMillis: dur, durationMillis: dur, didJustFinish: true });
    });

    audio.addEventListener("error", (e) => {
      console.warn("[WebAudio] load error", (e.target as HTMLAudioElement)?.error?.message ?? e);
    });

    audio.addEventListener("durationchange", () => this.emit());

    audio.src = uri;
    this.pollInterval = setInterval(() => this.emit(), 200);

    try {
      await audio.play();
      this.emit();
    } catch (err) {
      console.warn("[WebAudio] play() blocked:", err);
    }
  }

  async play(): Promise<void> {
    try { await this.audio?.play(); this.emit(); } catch {}
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

  async setPlaybackRate(rate: number): Promise<void> {
    this._rate = rate;
    if (this.audio) this.audio.playbackRate = rate;
  }

  async replay(): Promise<void> {
    if (this.audio) {
      this.audio.currentTime = 0;
      await this.audio.play().catch(() => {});
      this.emit();
    }
  }

  async unload(): Promise<void> {
    if (this.pollInterval) { clearInterval(this.pollInterval); this.pollInterval = null; }
    if (this.audio) {
      this.audio.pause();
      // Revoke blob URL to free memory
      if (this.audio.src?.startsWith("blob:")) {
        URL.revokeObjectURL(this.audio.src);
      }
      this.audio.src = "";
      this.audio = null;
    }
    this.statusCallback = null;
  }
}
