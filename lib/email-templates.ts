export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  content: string;
  thumbnail: string;
}

export const emailTemplates: EmailTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Canvas',
    description: 'Start from scratch',
    subject: '',
    content: '<p>Start writing your email here...</p>',
    thumbnail: '📄'
  },
  {
    id: 'monthly-menu',
    name: 'Monthly Menu',
    description: 'Showcase this month\'s cake flavors',
    subject: '🍰 This Month\'s Delicious Cake Menu!',
    thumbnail: '🍰',
    content: `
      <h1 style="text-align: center; color: #ec4899;">This Month's Featured Cakes</h1>
      <p style="text-align: center; font-size: 16px; color: #666;">Hi [Customer Name]! 👋</p>
      <p>We're excited to share our mouth-watering cake selection for this month! Each cake is made fresh to order with premium ingredients and lots of love.</p>

      <h2>✨ Featured Flavors</h2>
      <ul>
        <li><strong>Classic Vanilla Dream</strong> - Light, fluffy vanilla cake with buttercream frosting</li>
        <li><strong>Chocolate Decadence</strong> - Rich chocolate layers with ganache filling</li>
        <li><strong>Red Velvet Romance</strong> - Traditional red velvet with cream cheese frosting</li>
        <li><strong>Lemon Bliss</strong> - Zesty lemon cake with lemon curd filling</li>
      </ul>

      <p style="text-align: center; margin: 30px 0;">
        <strong>🎂 Remember: We need 10-14 days advance notice for all orders!</strong>
      </p>

      <p style="text-align: center;">
        <a href="https://kassycakes.com/cakes" style="background-color: #ec4899; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Order Your Cake Now</a>
      </p>

      <p style="margin-top: 40px; color: #888; font-size: 14px;">With love,<br><strong>Kassy Cakes</strong></p>
    `
  },
  {
    id: 'special-offer',
    name: 'Special Offer',
    description: 'Promote a discount or special deal',
    subject: '🎉 Special Offer Just For You!',
    thumbnail: '🎉',
    content: `
      <div style="text-align: center; background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%); color: white; padding: 40px 20px; border-radius: 12px; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 32px;">🎉 Limited Time Offer!</h1>
        <p style="font-size: 20px; margin: 10px 0;">Get [X]% Off Your Next Order</p>
      </div>

      <p>Dear valued customer,</p>

      <p>We're celebrating [occasion/milestone] and want to share the joy with you!</p>

      <h2>Here's Your Special Offer:</h2>
      <p style="font-size: 18px; background-color: #fef3f9; padding: 20px; border-radius: 8px; border-left: 4px solid #ec4899;">
        <strong>Use code: <span style="color: #ec4899; font-size: 24px;">SWEETDEAL</span></strong><br>
        Valid until [Date]
      </p>

      <p>Don't miss out on this sweet deal! Order your custom cake today and make your celebration extra special.</p>

      <p style="text-align: center; margin: 40px 0;">
        <a href="https://kassycakes.com/cakes" style="background-color: #ec4899; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 18px;">Shop Now</a>
      </p>

      <p style="color: #888; font-size: 14px;">*Terms and conditions apply. Cannot be combined with other offers.</p>
    `
  },
  {
    id: 'holiday',
    name: 'Holiday Greeting',
    description: 'Seasonal holiday message',
    subject: '🎄 Happy Holidays from Kassy Cakes!',
    thumbnail: '🎄',
    content: `
      <h1 style="text-align: center; color: #ec4899;">🎄 Season's Greetings! 🎄</h1>

      <p style="text-align: center; font-size: 18px;">Dear Friends & Customers,</p>

      <p>As the holiday season approaches, we wanted to take a moment to thank you for your continued support and trust in Kassy Cakes.</p>

      <p>Your celebrations have become our celebrations, and we're honored to be part of your special moments with our cakes!</p>

      <h2>🎂 Holiday Order Reminders:</h2>
      <ul>
        <li>Order early! Holiday season books up fast</li>
        <li>We need 10-14 days advance notice</li>
        <li>Custom designs available for all occasions</li>
        <li>Gift certificates now available!</li>
      </ul>

      <p style="text-align: center; background-color: #fef3f9; padding: 30px; border-radius: 12px; margin: 30px 0;">
        <strong style="font-size: 20px; color: #ec4899;">Wishing you a joyful holiday season<br>filled with love, laughter, and cake! 🍰</strong>
      </p>

      <p style="text-align: center;">
        <a href="https://kassycakes.com/cakes" style="background-color: #ec4899; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Order Your Holiday Cake</a>
      </p>

      <p style="margin-top: 40px; text-align: center;">Warmest wishes,<br><strong>The Kassy Cakes Team</strong></p>
    `
  },
  {
    id: 'new-flavor',
    name: 'New Flavor Launch',
    description: 'Announce a new cake flavor or product',
    subject: '🆕 Introducing Our Newest Flavor!',
    thumbnail: '🆕',
    content: `
      <div style="background-color: #fef3f9; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: #ec4899; margin: 0;">🆕 New Flavor Alert!</h1>
        <p style="font-size: 20px; margin: 10px 0;">You asked, we delivered!</p>
      </div>

      <p>Hi cake lovers! 👋</p>

      <p>We're thrilled to introduce our newest creation: <strong style="color: #ec4899; font-size: 20px;">[NEW FLAVOR NAME]</strong></p>

      <h2>What Makes It Special?</h2>
      <p>[Describe the flavor, ingredients, what makes it unique...]</p>

      <ul>
        <li>Made with [premium ingredients]</li>
        <li>Perfect for [occasions]</li>
        <li>[Special feature or technique]</li>
      </ul>

      <blockquote style="border-left: 4px solid #ec4899; padding-left: 20px; margin: 30px 0; font-style: italic; color: #666;">
        "This is hands down the best cake I've ever had!" - Early tester
      </blockquote>

      <p>Be among the first to try this amazing new flavor! Available for orders starting today.</p>

      <p style="text-align: center; margin: 40px 0;">
        <a href="https://kassycakes.com/cakes" style="background-color: #ec4899; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 18px;">Order Now</a>
      </p>

      <p style="margin-top: 40px;">Can't wait to hear what you think!<br><strong>Kassy</strong> 💕</p>
    `
  },
  {
    id: 'thank-you',
    name: 'Thank You',
    description: 'Show appreciation to customers',
    subject: '💕 Thank You for Your Order!',
    thumbnail: '💕',
    content: `
      <h1 style="text-align: center; color: #ec4899;">Thank You! 💕</h1>

      <p>Dear [Customer Name],</p>

      <p>We wanted to take a moment to say <strong>THANK YOU</strong> for choosing Kassy Cakes for your special celebration!</p>

      <p>It means the world to us that you trusted us to create something sweet for your memorable occasion. Your support helps us do what we love every single day.</p>

      <h2>We'd Love Your Feedback!</h2>
      <p>How was your experience? We're always looking to improve and would appreciate hearing from you.</p>

      <ul>
        <li>How did the cake taste?</li>
        <li>Was the design what you expected?</li>
        <li>How was the ordering process?</li>
      </ul>

      <p style="text-align: center; margin: 40px 0;">
        <a href="[Review Link]" style="background-color: #ec4899; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Leave a Review</a>
      </p>

      <p style="background-color: #fef3f9; padding: 20px; border-radius: 8px; text-align: center;">
        <strong>Got another celebration coming up?</strong><br>
        Book your next cake now and make it just as special!
      </p>

      <p style="margin-top: 40px;">With gratitude,<br><strong>Kassy Cakes</strong> 🎂</p>
    `
  },
  {
    id: 'order-reminder',
    name: 'Order Reminder',
    description: 'Remind customers about ordering ahead',
    subject: '⏰ Don\'t Forget to Order Your Cake!',
    thumbnail: '⏰',
    content: `
      <h1 style="text-align: center; color: #ec4899;">⏰ Upcoming Celebration?</h1>

      <p>Hi there! 👋</p>

      <p>Do you have a birthday, anniversary, or special event coming up soon?</p>

      <p>Just a friendly reminder that <strong style="color: #ec4899;">we need 10-14 days advance notice</strong> for all custom cake orders!</p>

      <h2>Why Order Early?</h2>
      <ul>
        <li>✅ Guarantee your preferred date</li>
        <li>✅ More time for custom design discussions</li>
        <li>✅ Avoid the last-minute rush</li>
        <li>✅ Peace of mind for your celebration</li>
      </ul>

      <div style="background-color: #fff4e6; border-left: 4px solid #ec4899; padding: 20px; margin: 30px 0;">
        <p style="margin: 0;"><strong>Pro Tip:</strong> Check out our Schedule tab on the website to see available dates!</p>
      </div>

      <p style="text-align: center; margin: 40px 0;">
        <a href="https://kassycakes.com/cakes" style="background-color: #ec4899; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 18px;">Order Your Cake</a>
      </p>

      <p>We can't wait to make your celebration extra sweet!</p>

      <p style="margin-top: 40px;">Best regards,<br><strong>Kassy Cakes</strong></p>
    `
  }
];

export function getTemplateById(id: string): EmailTemplate | undefined {
  return emailTemplates.find(template => template.id === id);
}
