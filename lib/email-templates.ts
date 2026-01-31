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
    id: 'new-arrivals',
    name: 'New Arrivals',
    description: 'Showcase the latest merch drops',
    subject: '🔥 Fresh Drops Just Landed at POPDRP!',
    thumbnail: '🔥',
    content: `
      <h1 style="text-align: center; color: #ef4444;">New Arrivals Are Here</h1>
      <p style="text-align: center; font-size: 16px; color: #666;">Hey [Customer Name]! 👋</p>
      <p>We just restocked the lineup with brand-new pieces you don't want to miss. Every item is designed in-house and produced in limited runs — once they're gone, they're gone.</p>

      <h2>🛍️ This Month's Highlights</h2>
      <ul>
        <li><strong>Oversized Logo Tee</strong> - Heavyweight cotton, relaxed fit, screen-printed graphic</li>
        <li><strong>Embroidered Hoodie</strong> - Fleece-lined pullover with contrast stitch detailing</li>
        <li><strong>Cargo Joggers</strong> - Utility-inspired silhouette with adjustable cuffs</li>
        <li><strong>Snapback Cap</strong> - Structured crown, flat brim, embroidered POPDRP logo</li>
      </ul>

      <p style="text-align: center; margin: 30px 0;">
        <strong>Sizes are limited — shop early for the best selection.</strong>
      </p>

      <p style="text-align: center;">
        <a href="\${process.env.NEXT_PUBLIC_BASE_URL || ''}" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Shop New Arrivals</a>
      </p>

      <p style="margin-top: 40px; color: #888; font-size: 14px;">Stay fresh,<br><strong>POPDRP</strong></p>
    `
  },
  {
    id: 'special-offer',
    name: 'Special Offer',
    description: 'Promote a discount or special deal',
    subject: '🎉 Special Offer Just For You!',
    thumbnail: '🎉',
    content: `
      <div style="text-align: center; background: linear-gradient(135deg, #ef4444 0%, #f87171 100%); color: white; padding: 40px 20px; border-radius: 12px; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 32px;">🎉 Limited Time Offer!</h1>
        <p style="font-size: 20px; margin: 10px 0;">Get [X]% Off Your Next Order</p>
      </div>

      <p>Dear valued customer,</p>

      <p>We're celebrating [occasion/milestone] and want to share the love with you!</p>

      <h2>Here's Your Exclusive Deal:</h2>
      <p style="font-size: 18px; background-color: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #ef4444;">
        <strong>Use code: <span style="color: #ef4444; font-size: 24px;">POPDRP20</span></strong><br>
        Valid until [Date]
      </p>

      <p>Don't sleep on this one — add your favorites to cart and lock in the savings before the deal expires.</p>

      <p style="text-align: center; margin: 40px 0;">
        <a href="\${process.env.NEXT_PUBLIC_BASE_URL || ''}" style="background-color: #ef4444; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 18px;">Shop Now</a>
      </p>

      <p style="color: #888; font-size: 14px;">*Terms and conditions apply. Cannot be combined with other offers.</p>
    `
  },
  {
    id: 'holiday',
    name: 'Holiday Greeting',
    description: 'Seasonal holiday message',
    subject: '🎄 Happy Holidays from POPDRP!',
    thumbnail: '🎄',
    content: `
      <h1 style="text-align: center; color: #ef4444;">🎄 Season's Greetings! 🎄</h1>

      <p style="text-align: center; font-size: 18px;">Dear Friends & Customers,</p>

      <p>As the holiday season approaches, we wanted to take a moment to thank you for your continued support and for rocking POPDRP all year long.</p>

      <p>Your loyalty means everything to us, and we're proud to see our community growing stronger every day.</p>

      <h2>🎁 Holiday Shopping Reminders:</h2>
      <ul>
        <li>Order early to guarantee delivery before the holidays</li>
        <li>Check out our gift bundles for easy gifting</li>
        <li>Limited-edition holiday pieces are available now</li>
        <li>Digital gift cards available for last-minute shoppers!</li>
      </ul>

      <p style="text-align: center; background-color: #fef2f2; padding: 30px; border-radius: 12px; margin: 30px 0;">
        <strong style="font-size: 20px; color: #ef4444;">Wishing you a joyful holiday season<br>filled with good vibes and great gear!</strong>
      </p>

      <p style="text-align: center;">
        <a href="\${process.env.NEXT_PUBLIC_BASE_URL || ''}" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Shop Holiday Collection</a>
      </p>

      <p style="margin-top: 40px; text-align: center;">Warmest wishes,<br><strong>The POPDRP Team</strong></p>
    `
  },
  {
    id: 'new-drop',
    name: 'New Drop',
    description: 'Announce a new merch drop or product',
    subject: '🆕 New Drop Just Hit the Store!',
    thumbnail: '🆕',
    content: `
      <div style="background-color: #fef2f2; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: #ef4444; margin: 0;">🆕 New Drop Alert!</h1>
        <p style="font-size: 20px; margin: 10px 0;">You asked, we delivered!</p>
      </div>

      <p>What's good, POPDRP fam! 👋</p>

      <p>We're hyped to introduce the latest addition to the lineup: <strong style="color: #ef4444; font-size: 20px;">[NEW PRODUCT NAME]</strong></p>

      <h2>What Makes It Stand Out?</h2>
      <p>[Describe the product, materials, design inspiration...]</p>

      <ul>
        <li>Crafted with [premium materials]</li>
        <li>Available in [sizes/colors]</li>
        <li>[Special design detail or feature]</li>
      </ul>

      <blockquote style="border-left: 4px solid #ef4444; padding-left: 20px; margin: 30px 0; font-style: italic; color: #666;">
        "This is the hardest piece POPDRP has dropped yet." - Early reviewer
      </blockquote>

      <p>Be among the first to cop this new drop! Available now while supplies last.</p>

      <p style="text-align: center; margin: 40px 0;">
        <a href="\${process.env.NEXT_PUBLIC_BASE_URL || ''}" style="background-color: #ef4444; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 18px;">Shop the Drop</a>
      </p>

      <p style="margin-top: 40px;">Stay locked in,<br><strong>POPDRP</strong></p>
    `
  },
  {
    id: 'thank-you',
    name: 'Thank You',
    description: 'Show appreciation to customers',
    subject: '🙏 Thank You for Your Order!',
    thumbnail: '🙏',
    content: `
      <h1 style="text-align: center; color: #ef4444;">Thank You! 🙏</h1>

      <p>Dear [Customer Name],</p>

      <p>We wanted to take a moment to say <strong>THANK YOU</strong> for shopping with POPDRP!</p>

      <p>It means the world to us that you chose to rock our gear. Your support keeps us creating and pushing new designs every day.</p>

      <h2>We'd Love Your Feedback!</h2>
      <p>How was your experience? We're always looking to improve and would appreciate hearing from you.</p>

      <ul>
        <li>How's the fit and sizing?</li>
        <li>Are you happy with the quality and materials?</li>
        <li>How was the ordering and delivery experience?</li>
      </ul>

      <p style="text-align: center; margin: 40px 0;">
        <a href="[Review Link]" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Leave a Review</a>
      </p>

      <p style="background-color: #fef2f2; padding: 20px; border-radius: 8px; text-align: center;">
        <strong>Got your eye on something else?</strong><br>
        Check out our latest drops and keep your wardrobe fresh!
      </p>

      <p style="margin-top: 40px;">With gratitude,<br><strong>POPDRP</strong></p>
    `
  },
  {
    id: 'restock-alert',
    name: 'Restock Alert',
    description: 'Notify customers about restocked or limited items',
    subject: '🔔 Restock Alert — Don\'t Miss Out!',
    thumbnail: '🔔',
    content: `
      <h1 style="text-align: center; color: #ef4444;">🔔 Back in Stock!</h1>

      <p>Hi there! 👋</p>

      <p>Good news — some of our most popular items just got restocked. These pieces sold out fast last time, so don't wait.</p>

      <p style="font-size: 18px; text-align: center;"><strong style="color: #ef4444;">Limited quantities available — once they're gone, they're gone.</strong></p>

      <h2>Why Act Now?</h2>
      <ul>
        <li>These items sold out in days last drop</li>
        <li>Limited restock — we won't be making more</li>
        <li>Full size runs available right now</li>
        <li>Free shipping on orders over [amount]</li>
      </ul>

      <div style="background-color: #fff4e6; border-left: 4px solid #ef4444; padding: 20px; margin: 30px 0;">
        <p style="margin: 0;"><strong>Pro Tip:</strong> Add items to your cart now to lock in your size before they sell out again!</p>
      </div>

      <p style="text-align: center; margin: 40px 0;">
        <a href="\${process.env.NEXT_PUBLIC_BASE_URL || ''}" style="background-color: #ef4444; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 18px;">Shop Restocked Items</a>
      </p>

      <p>Don't sleep on it — grab your favorites before they're gone for good!</p>

      <p style="margin-top: 40px;">Best regards,<br><strong>POPDRP</strong></p>
    `
  }
];

export function getTemplateById(id: string): EmailTemplate | undefined {
  return emailTemplates.find(template => template.id === id);
}
