import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const key = process.env.TOMTOM_API_KEY;
const query = 'bangla';
const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${key}&limit=5&countrySet=IN`;

console.log('Testing TomTom API...');
console.log('URL:', url.replace(key, 'HIDDEN'));

axios.get(url)
  .then(resp => {
    console.log('Success!');
    console.log('Results count:', resp.data.results.length);
    console.log('First result:', resp.data.results[0]?.address.freeformAddress);
  })
  .catch(err => {
    console.error('Error:', err.message);
    if (err.response) {
        console.error('Response status:', err.response.status);
        console.error('Response data:', JSON.stringify(err.response.data));
    }
  });
