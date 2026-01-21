import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const key = process.env.GROQ_API_KEY;
const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const url = 'https://api.groq.com/openai/v1/chat/completions';

console.log('Testing Groq API...');
console.log('Model:', model);
console.log('Key exists:', !!key);

const data = {
  model: model,
  messages: [
    { role: 'system', content: 'You are a helpful assistant. Return JSON.' },
    { role: 'user', content: 'Say hello in JSON format.' }
  ],
  response_format: { type: "json_object" }
};

axios.post(url, data, {
  headers: {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json'
  }
})
  .then(resp => {
    console.log('Success!');
    console.log('Response:', JSON.stringify(resp.data.choices[0].message.content, null, 2));
  })
  .catch(err => {
    console.error('Error:', err.message);
    if (err.response) {
        console.error('Status:', err.response.status);
        console.error('Data:', JSON.stringify(err.response.data, null, 2));
    }
  });
