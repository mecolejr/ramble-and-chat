exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { message, chat_history } = JSON.parse(event.body);

    const response = await fetch('https://api.cohere.ai/v1/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.COHERE_API_KEY
      },
      body: JSON.stringify({
        model: 'command-r',
        message,
        preamble: 'You are Ramble, a friendly and curious AI chatbot created by Marcus Cole. Keep replies warm and conversational, usually 2-4 sentences. Ask a natural follow-up question when it feels right.',
        chat_history
      })
    });

    const data = await response.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: data.text })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
