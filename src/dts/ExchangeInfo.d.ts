export default interface ExchangeInfo {
    action: 'volume' | 'play' | 'pause' | 'continue' | 'end' | 'start' | 'jump' | 'tab-status' | 'popup-disable';
    value: string | number | boolean;
}