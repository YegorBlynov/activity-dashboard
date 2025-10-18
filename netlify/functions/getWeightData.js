// netlify/functions/getWeightData.js
const fetch = require('node-fetch');

const { API_KEY, WEIGHT_SPREADSHEET_ID } = process.env;
const RANGE = 'A1:B';
const API_URL = `https://sheets.googleapis.com/v4/spreadsheets/${WEIGHT_SPREADSHEET_ID}/values/${RANGE}?key=${API_KEY}`;

exports.handler = async function() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        return { statusCode: 200, body: JSON.stringify(data) };
    } catch (error) {
        return { statusCode: 500, body: error.toString() };
    }
};