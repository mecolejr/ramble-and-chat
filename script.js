document.addEventListener('DOMContentLoaded', () => {
    const promptEl = document.getElementById('prompt');
    const submitBtn = document.getElementById('submit');
    const chatMessages = document.getElementById('chat-messages');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');

    const chatHistory = [];

    const initDarkMode = () => {
        const isDark = localStorage.getItem('darkMode') === 'true';
        if (isDark) {
            document.documentElement.classList.add('dark');
            sunIcon.classList.remove('hidden');
            moonIcon.classList.add('hidden');
        } else {
            document.documentElement.classList.remove('dark');
            sunIcon.classList.add('hidden');
            moonIcon.classList.remove('hidden');
        }
    };

    const toggleDarkMode = () => {
        const isDark = document.documentElement.classList.contains('dark');
        if (isDark) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('darkMode', 'false');
            sunIcon.classList.add('hidden');
            moonIcon.classList.remove('hidden');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('darkMode', 'true');
            sunIcon.classList.remove('hidden');
            moonIcon.classList.add('hidden');
        }
    };

    initDarkMode();
    darkModeToggle.addEventListener('click', toggleDarkMode);

    const autoResize = () => {
        promptEl.style.height = 'auto';
        promptEl.style.height = Math.min(promptEl.scrollHeight, 120) + 'px';
    };
    promptEl.addEventListener('input', autoResize);

    const getAIResponse = async (userMessage) => {
        const response = await fetch('/.netlify/functions/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: userMessage,
                chat_history: chatHistory.map(h => ({ role: h.role, message: h.message }))
            })
        });

        if (!response.ok) throw new Error('Request failed: ' + response.status);

        const data = await response.json();
        const reply = data.text ? data.text.trim() : '';

        if (reply) {
            chatHistory.push({ role: 'USER', message: userMessage });
            chatHistory.push({ role: 'CHATBOT', message: reply });
        }

        return reply;
    };

    const addMessage = (content, isUser = false) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'flex ' + (isUser ? 'justify-end' : 'justify-start');

        const messageBubble = document.createElement('div');
        messageBubble.className = 'max-w-xs lg:max-w-md px-4 py-2 rounded-lg ' + (
            isUser
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200'
        );
        messageBubble.textContent = content;

        messageDiv.appendChild(messageBubble);
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const submitPrompt = async () => {
        const prompt = promptEl.value.trim();
        if (!prompt) return;

        addMessage(prompt, true);
        promptEl.value = '';
        promptEl.style.height = 'auto';

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';

        try {
            const response = await getAIResponse(prompt);
            addMessage(response || 'Sorry, I got an empty response. Try again!', false);
        } catch (error) {
            console.error('Error:', error);
            addMessage('Something went wrong connecting to Ramble. Please try again.', false);
        }

        submitBtn.disabled = false;
        submitBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>';
    };

    submitBtn.addEventListener('click', submitPrompt);

    promptEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitPrompt();
        }
    });
});
