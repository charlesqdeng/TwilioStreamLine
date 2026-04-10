import Twilio from 'twilio';

export class TwilioService {
  /**
   * Create a Twilio client with appropriate authentication
   */
  private static createClient(
    accountSid: string,
    authToken: string,
    apiKeySid?: string | null
  ) {
    if (apiKeySid) {
      // API Key authentication
      return Twilio(apiKeySid, authToken, { accountSid });
    } else {
      // Auth Token authentication
      return Twilio(accountSid, authToken);
    }
  }
  /**
   * Validate Twilio credentials by making a test API call
   * Supports both Auth Token and API Key authentication
   */
  static async validateCredentials(
    twilioSid: string,
    authToken: string,
    accountSid?: string
  ): Promise<boolean> {
    try {
      let client;

      // Determine auth method based on twilioSid prefix
      if (twilioSid.startsWith('SK')) {
        // API Key authentication (SK + secret + accountSid)
        if (!accountSid) {
          console.error('Account SID required for API Key authentication');
          return false;
        }
        console.log(`Validating API Key credentials: SK=${twilioSid.substring(0, 8)}..., Account=${accountSid}`);
        client = Twilio(twilioSid, authToken, { accountSid });

        // For API Keys, try to list incoming phone numbers (simpler call that works with API Keys)
        // We just need to verify the credentials work, don't need actual data
        await client.incomingPhoneNumbers.list({ limit: 1 });
      } else {
        // Auth Token authentication (AC + auth token)
        console.log(`Validating Auth Token credentials: Account=${twilioSid}`);
        client = Twilio(twilioSid, authToken);
        await client.api.v2010.accounts(twilioSid).fetch();
      }

      console.log('✅ Twilio credentials validated successfully');
      return true;
    } catch (error: any) {
      console.error('❌ Twilio credential validation failed:', {
        code: error.code,
        message: error.message,
        status: error.status,
        moreInfo: error.moreInfo,
      });
      return false;
    }
  }

  /**
   * Create a Sink for Event Streams
   */
  static async createSink(
    accountSid: string,
    authToken: string,
    webhookUrl: string,
    description: string,
    apiKeySid?: string | null
  ): Promise<string | null> {
    try {
      const client = this.createClient(accountSid, authToken, apiKeySid);
      const sink = await client.events.v1.sinks.create({
        description,
        sinkConfiguration: {
          destination: webhookUrl,
          method: 'POST',
          batchEvents: false,
        },
        sinkType: 'webhook',
      });
      return sink.sid;
    } catch (error) {
      console.error('Failed to create Twilio Sink:', error);
      return null;
    }
  }

  /**
   * Delete a Sink
   */
  static async deleteSink(
    accountSid: string,
    authToken: string,
    sinkSid: string,
    apiKeySid?: string | null
  ): Promise<boolean> {
    try {
      const client = this.createClient(accountSid, authToken, apiKeySid);
      await client.events.v1.sinks(sinkSid).remove();
      return true;
    } catch (error) {
      console.error('Failed to delete Twilio Sink:', error);
      return false;
    }
  }

  /**
   * Fetch available Event Types
   */
  static async fetchEventTypes(
    accountSid: string,
    authToken: string,
    apiKeySid?: string | null
  ): Promise<string[]> {
    try {
      const client = this.createClient(accountSid, authToken, apiKeySid);
      const eventTypes = await client.events.v1.eventTypes.list();
      return eventTypes.map((et) => et.type);
    } catch (error) {
      console.error('Failed to fetch Event Types:', error);
      return [];
    }
  }

  /**
   * Create or update a Subscription
   */
  static async createSubscription(
    accountSid: string,
    authToken: string,
    sinkSid: string,
    eventTypes: string[],
    apiKeySid?: string | null
  ): Promise<string | null> {
    try {
      const client = this.createClient(accountSid, authToken, apiKeySid);
      const subscription = await client.events.v1.subscriptions.create({
        description: 'StreamLine Subscription',
        sinkSid,
        types: eventTypes.map((type) => ({ type })),
      });
      return subscription.sid;
    } catch (error) {
      console.error('Failed to create Subscription:', error);
      return null;
    }
  }

  /**
   * Update an existing Subscription
   */
  static async updateSubscription(
    accountSid: string,
    authToken: string,
    subscriptionSid: string,
    eventTypes: string[],
    apiKeySid?: string | null
  ): Promise<boolean> {
    try {
      const client = this.createClient(accountSid, authToken, apiKeySid);
      await client.events.v1.subscriptions(subscriptionSid).update({
        types: eventTypes.map((type) => ({ type })),
      });
      return true;
    } catch (error) {
      console.error('Failed to update Subscription:', error);
      return false;
    }
  }

  /**
   * Delete a Subscription
   */
  static async deleteSubscription(
    accountSid: string,
    authToken: string,
    subscriptionSid: string,
    apiKeySid?: string | null
  ): Promise<boolean> {
    try {
      const client = this.createClient(accountSid, authToken, apiKeySid);
      await client.events.v1.subscriptions(subscriptionSid).remove();
      return true;
    } catch (error) {
      console.error('Failed to delete Subscription:', error);
      return false;
    }
  }
}
