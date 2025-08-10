document.addEventListener('DOMContentLoaded', () => {
    const promptEl = document.getElementById('prompt');
    const submitBtn = document.getElementById('submit');
    const chatMessages = document.getElementById('chat-messages');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');

    // Minimal chat history to send to backend
    const history = [
      { role: 'assistant', content: 'Hi! I am Ramble. What would you like to talk about?' }
    ];

    // Dark mode functionality
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

    // Initialize dark mode
    initDarkMode();
    darkModeToggle.addEventListener('click', toggleDarkMode);

    // Auto-resize textarea
    const autoResize = () => {
        promptEl.style.height = 'auto';
        promptEl.style.height = Math.min(promptEl.scrollHeight, 120) + 'px';
    };

    promptEl.addEventListener('input', autoResize);

    // Backend Intake API (TruePlace) - never expose API keys on the client
    const CHAT_API_URL = (window.CHAT_API_URL || 'http://localhost:3000/api/chat-intake');

    const getAIResponse = async () => {
        try {
            const response = await fetch(CHAT_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: history })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Chat API failed: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            const text = data?.text || 'Could you tell me more?';
            return text;
        } catch (error) {
            console.error('Chat API Error:', error);
            const fallback = [
                `Thanks for sharing! Tell me more.`,
                `Interesting—what else would you add?`,
                `Got it. What matters most to you about this?`,
            ];
            return fallback[Math.floor(Math.random() * fallback.length)];
        }
    };

    // Add message to chat with dark mode support
    const addMessage = (content, isUser = false) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `flex ${isUser ? 'justify-end' : 'justify-start'}`;
        
        const messageBubble = document.createElement('div');
        messageBubble.className = `max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
            isUser 
                ? 'bg-blue-500 text-white' 
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200'
        }`;
        messageBubble.textContent = content;
        
        messageDiv.appendChild(messageBubble);
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const submitPrompt = async () => {
        const prompt = promptEl.value.trim();
        if (!prompt) {
            return;
        }

        // Add user message
        addMessage(prompt, true);
        history.push({ role: 'user', content: prompt });

        // Clear input and reset height
        promptEl.value = '';
        promptEl.style.height = 'auto';

        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        `;

        // Get AI response
        const response = await getAIResponse();
        
        // Add AI message
        addMessage(response, false);
        history.push({ role: 'assistant', content: response });

        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
            </svg>
        `;
    };

    // Submit button click event
    submitBtn.addEventListener('click', submitPrompt);

    // Enter key press event on textarea
    promptEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitPrompt();
        }
    });

    // Seed assistant greeting in UI
    addMessage(history[0].content, false);
});
