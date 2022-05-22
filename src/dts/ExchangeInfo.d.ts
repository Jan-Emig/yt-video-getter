export default interface ExchangeInfo {
    action: 'volume-change' | 'pause' | 'continue' | 'end' | 'start' | 'jump' | 'tab-status' | 'popup-disable';
    value: string | number | boolean;
}