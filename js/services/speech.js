window.speechSynthesis.onvoiceschanged = () => {
    voices = window.speechSynthesis.getVoices();
};

function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "vi-VN";
    utterance.rate = 1.0;

    const availableVoices = voices.length ? voices : window.speechSynthesis.getVoices();
    const viVoice = availableVoices.find(v => v.lang.includes("vi") || v.name.toLowerCase().includes("viet"));
    if (viVoice) utterance.voice = viVoice;

    window.speechSynthesis.speak(utterance);
}
