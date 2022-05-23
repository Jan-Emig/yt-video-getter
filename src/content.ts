import { isYtVideoTab } from "./helper";
import VideoInfo from "./dts/VideoInfo";
import ExchangeInfo from "./dts/ExchangeInfo";

const video_info: VideoInfo = {
    title: null,
    status: null,
    duration: null,
    timestamp: null,
    url: null,
    likes: null,
    views: null,
    channel: null,
    volume: null
};

/**
 * HELPER FUNCTIONS
 */
const getNumberFromText = (text: string | null | undefined, remove_space = true): number | null => {
    try { 
        if (!text) throw Error();
        const res = Number(text.substring(0, text.indexOf(' ') - ( (remove_space) ? 1 : 0) ).replace(/,/g, '') ); 
        return isNaN(res) ? null : res;
    }
    catch { return null; }
}

/**
 * EVENT HANDLERS 
 */
const handleVideoPlay = (video_elmnt: HTMLVideoElement) => {
    const progessListenerFunc = () => {
        if (document.querySelector<HTMLTitleElement>('div#info-contents h1.title yt-formatted-string')?.textContent != video_info.title) {
            video_elmnt.removeEventListener('progress', progessListenerFunc);
            gatherVideoInfo();
            chrome.runtime.sendMessage({ action: 'play' });
        }
    }

    if (video_elmnt.src != video_info.url) video_elmnt.addEventListener('progress', progessListenerFunc); // new video gets played
    else if (video_info.status == 'paused') {
        video_info.status = 'playing'; // paused video continues playing
        chrome.runtime.sendMessage({ action: 'play' });
    }
}

const handleVideoPause = (video_elmnt: HTMLVideoElement) => {
    video_info.status = 'paused';
    video_info.timestamp = video_elmnt.currentTime;
    chrome.runtime.sendMessage({ action: 'pause' });
}

const handleVideoEnd = (video_elmnt: HTMLVideoElement) => {
    video_info.status = 'ended';
    video_info.timestamp = video_elmnt.currentTime;
}

const handleTimeJump = (video_elmnt: HTMLVideoElement) => {
    video_info.timestamp = video_elmnt.currentTime;
    chrome.runtime.sendMessage({ action: 'jump' });
}

const handleVolumeChange = (video_elmnt: HTMLVideoElement) => {
    video_info.volume = Number(video_elmnt.volume.toFixed(1));
    chrome.runtime.sendMessage({ action: 'volume' });
}

const gatherVideoInfo = (wait_until_done = false) => {
    const video_elmnt = document.querySelector<HTMLVideoElement>('video.video-stream');
    video_info.channel = document.querySelector<HTMLLinkElement>('.ytd-channel-name #text a')?.textContent ?? null;

    const likes_aria_label = document.querySelector('#top-level-buttons-computed ytd-toggle-button-renderer yt-formatted-string#text')?.ariaLabel;
    video_info.likes = getNumberFromText(likes_aria_label);

    const views_label = document.querySelector('span.view-count')?.textContent;
    video_info.views = getNumberFromText(views_label);
    
    video_info.title = document.querySelector<HTMLTitleElement>('div#info-contents h1.title yt-formatted-string')?.textContent ?? null;

    if (video_elmnt) {
        video_info.duration = video_elmnt.duration;
        video_info.url = video_elmnt.src;
        video_info.status = 
            (video_elmnt.currentTime > 0 && !video_elmnt.paused && !video_elmnt.ended && video_elmnt.readyState > 2)
                ? 'playing'
                : (video_elmnt.currentTime > 0)
                    ? 'paused'
                    : undefined;
        video_info.timestamp = video_elmnt.currentTime;
        video_info.volume = Number(video_elmnt.volume.toFixed(1));
    }
    // If requested, try information lookup again until all core informations could be acquired
    if (wait_until_done && (!video_info.channel || !video_info.title)) setTimeout(() => gatherVideoInfo(true), 500);

    return video_info;
}

/**
 * 
 */
const initScript = () => {
    const video_elmnt = document.querySelector<HTMLVideoElement>('video.video-stream');
    if (video_elmnt) {
        if (init_interval) clearInterval(init_interval);
        video_elmnt.addEventListener('play', () => handleVideoPlay(video_elmnt)) //video starts playing
        video_elmnt.addEventListener('pause', () => handleVideoPause(video_elmnt));
        video_elmnt.addEventListener('ended', () => handleVideoEnd(video_elmnt));
        video_elmnt.addEventListener('seeked', () => handleTimeJump(video_elmnt)); // Jumps
        video_elmnt.addEventListener('volumechange', () => handleVolumeChange(video_elmnt));
        gatherVideoInfo(true);
    }
}

/**
 * *ENTRY POINT
 */
let init_interval: NodeJS.Timer | null = null;
if (isYtVideoTab(window.location.href)) {
    if (document.readyState !== 'complete') {
        document.onreadystatechange = () => {
            if (document.readyState == 'complete') {
                init_interval = setInterval(() => initScript, 100);
                initScript();
            }
        }
    } else initScript();
}

/**
 * Sends the service worker all video information that could be acquired until now
 */
chrome.runtime.onMessage.addListener((req: ExchangeInfo, sender, sendResponse) => sendResponse(gatherVideoInfo()));
