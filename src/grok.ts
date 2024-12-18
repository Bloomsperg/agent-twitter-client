import { TwitterAuth } from './auth';

export async function createGrokRequest(text: string, auth: TwitterAuth) {
  const onboardingTaskUrl = 'https://api.twitter.com/1.1/onboarding/task.json';

  const cookies = await auth.cookieJar().getCookies(onboardingTaskUrl);
  const xCsrfToken = cookies.find((cookie) => cookie.key === 'ct0');

  //@ ts-expect-error - This is a private API.
  const headers = new Headers({
    authorization: `Bearer ${(auth as any).bearerToken}`,
    cookie: await auth.cookieJar().getCookieString(onboardingTaskUrl),
    'content-type': 'application/json',
    'User-Agent':
      'Mozilla/5.0 (Linux; Android 11; Nokia G20) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.88 Mobile Safari/537.36',
    'x-guest-token': (auth as any).guestToken,
    'x-twitter-auth-type': 'OAuth2Client',
    'x-twitter-active-user': 'yes',
    'x-twitter-client-language': 'en',
    'x-csrf-token': xCsrfToken?.value as string,
  });

  const variables: Record<string, any> = {
    variables: {},
    queryId: '6cmfJY3d7EPWuCSXWrkOFg',
  };

  const response = await fetch(
    `https://x.com/i/api/graphql/6cmfJY3d7EPWuCSXWrkOFg/CreateGrokConversation`,
    {
      headers,
      body: JSON.stringify({
        variables,
      }),
      method: 'POST',
    },
  );

  const data = await response.json();
  const conversationId = data.data.create_grok_conversation.conversation_id;

  const grokVariables = {
    responses: [
      {
        message: text,
        sender: 1,
        promptSource: '',
        fileAttachments: [],
      },
    ],
    systemPromptName: '',
    grokModelOptionId: 'grok-2a',
    conversationId: conversationId,
    returnSearchResults: true,
    returnCitations: true,
    promptMetadata: {
      promptSource: 'NATURAL',
      action: 'INPUT',
    },
    imageGenerationCount: 4,
    requestFeatures: {
      eagerTweets: true,
      serverHistory: true,
    },
  };

  const streamHeaders = new Headers({
    authorization: `Bearer ${(auth as any).bearerToken}`,
    cookie: await auth.cookieJar().getCookieString(onboardingTaskUrl),
    'content-type': 'text/plain;charset=UTF-8',
    'User-Agent':
      'Mozilla/5.0 (Linux; Android 11; Nokia G20) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.88 Mobile Safari/537.36',
    'x-guest-token': (auth as any).guestToken,
    'x-twitter-auth-type': 'OAuth2Client',
    'x-twitter-active-user': 'yes',
    'x-twitter-client-language': 'en',
    'x-csrf-token': xCsrfToken?.value as string,
  });

  const streamResponse = await fetch(
    'https://api.x.com/2/grok/add_response.json',
    {
      headers: streamHeaders,
      body: JSON.stringify(grokVariables),
      method: 'POST',
    },
  );

  let buffer = '';
  let message = '';
  if (streamResponse.body) {
    const reader = streamResponse.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf('\n');
      while (boundary !== -1) {
        const chunk = buffer.slice(0, boundary).trim();
        buffer = buffer.slice(boundary + 1);
        if (chunk) {
          try {
            const json = JSON.parse(chunk);
            if (json.result) {
              if (json.result.message) {
                message += json.result.message;
              }
            }
          } catch (e) {
            console.error('Failed to parse JSON chunk:', chunk, e);
          }
        }
        boundary = buffer.indexOf('\n');
      }
    }
  }

  return message;
}
