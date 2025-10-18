// netlify/functions/getActivityData.js
const fetch = require('node-fetch');

const { API_KEY, ACTIVITY_SPREADSHEET_ID } = process.env;
const RANGE = 'A1:G';
const API_URL = `https://sheets.googleapis.com/v4/spreadsheets/${ACTIVITY_SPREADSHEET_ID}/values/${RANGE}?key=${API_KEY}`;

exports.handler = async function() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        return { statusCode: 200, body: JSON.stringify(data) };
    } catch (error) {
        return { statusCode: 500, body: error.toString() };
    }
};