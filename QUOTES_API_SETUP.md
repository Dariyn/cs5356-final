# Setting Up the Inspirational Quotes API

The Kanban Board application includes an inspirational quotes feature that uses the API Ninjas Quotes API. 

## Getting an API Key

To use this feature with real data:

1. Sign up for a free account at [API Ninjas](https://api-ninjas.com/)
2. Once registered, go to your dashboard to find your API key
3. Create a `.env.local` file in the root of your project if it doesn't exist already
4. Add the following line to your `.env.local` file:

```
NEXT_PUBLIC_QUOTES_API_KEY=your_api_key_here
```

5. Replace `your_api_key_here` with the actual API key you received from API Ninjas
6. Restart your development server if it's running

## Using the Feature

- Without an API key, the application will display a small set of fallback quotes
- With a valid API key, you'll get a random quote from the extensive API Ninjas collection

## API Usage Limits

- The free tier of API Ninjas offers 50,000 API calls per month
- This should be more than sufficient for development and personal use

## Troubleshooting

If you encounter issues with the quotes feature:

1. Verify your API key is correctly set in the `.env.local` file
2. Check the browser console for specific error messages
3. Ensure your internet connection is active
4. The API might occasionally be down for maintenance 