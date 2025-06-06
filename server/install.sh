nvm use 18

npm init -y
npm install express mongoose bcryptjs jsonwebtoken dotenv @google/generative-ai cors uuid

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "GEMINI_API_KEY=your_api_key_here" > .env
    echo "Created .env file. Please replace 'your_api_key_here' with your actual Gemini API key."
fi
