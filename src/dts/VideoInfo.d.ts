export default interface VideoInfo {
    title: string | null;
    status: 'playing' | 'paused' | 'ended' | null | undefined;
    duration: number | null;
    timestamp: number | null;
    url: string | null;
    likes: number | null;
    views: number | null;
    channel: string | null;
    volume: number | null

}