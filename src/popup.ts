import { isYtVideoTab } from "./helper";
import ExchangeInfo from "./dts/ExchangeInfo";


chrome.tabs.query({ active: true }, (res) => {
    const tab = res[0];
    const content = document.querySelector('.form-switch');
    if (isYtVideoTab(tab.url)) {
        const switch_input = document.querySelector<HTMLInputElement>('#state-switch');
        
        chrome.runtime.sendMessage({ action: 'tab-status' }, (res: {status: number, value: boolean}) => {
            if (switch_input && res.status == 200) switch_input.checked = res.value;
        });

        switch_input?.addEventListener('change', e => {
            chrome.runtime.sendMessage({ action: 'popup-disable', value: switch_input.checked} as ExchangeInfo);
        });


        if (content) content.classList.remove('d-none');
    } else if (content) content.classList.add('d-none');
})