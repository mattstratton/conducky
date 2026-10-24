---
sidebar_position: 7
---

# Technical & Integration FAQ

Browser support, mobile experience, API access, and technical questions.

## What browsers are supported?

Conducky works best with modern browsers:
- **Recommended**: Chrome, Firefox, Safari, Edge (latest versions)
- **Mobile**: All modern mobile browsers
- **Features**: JavaScript must be enabled

## Is Conducky mobile-friendly?

Yes! Conducky is designed with mobile-first principles:
- Responsive design works on all screen sizes
- Touch-friendly interface for smartphones and tablets
- Optimized navigation for mobile devices

*Screenshot needed: Mobile interface showing responsive design*

## Can I use Conducky offline?

No, Conducky requires an internet connection to function. All data is stored securely on the server and requires real-time access.

## How is my data backed up?

Data backup and security are handled by your system administrators. For specific backup policies and data retention, contact your organization's administrators.

## Does Conducky have an API?

Yes! Conducky provides a comprehensive REST API. See the [API Reference](/api) for complete documentation.

## Can Conducky integrate with other systems?

The API allows for various integrations. Common integration points include:
- **Email systems**: For notifications and incident submission
- **Chat platforms**: For team notifications (Slack, Discord, etc.)
- **Analytics tools**: For reporting and metrics
- **Authentication systems**: For single sign-on (SSO)

Contact your system administrators about specific integration needs.

## What authentication methods are supported?

Conducky supports multiple authentication methods:
- **Email and password**: Standard account creation
- **Social login**: OAuth with Google, GitHub, and other providers
- **Invitation-based**: Account creation through event invitations
- **Single Sign-On (SSO)**: Enterprise authentication integration

## Is two-factor authentication available?

Two-factor authentication (2FA) support is planned for future releases. Check with your system administrators about current security features and timeline for 2FA implementation.

## How secure is Conducky?

Conducky implements multiple security measures:
- **Encrypted data transmission**: All communication uses HTTPS
- **Role-based access control**: Users only see authorized information
- **Event isolation**: Data is strictly separated between events
- **Audit logging**: All actions are tracked for security monitoring
- **Regular security updates**: Platform is maintained with latest security patches

## What happens if I forget my password?

To reset your password:
1. Go to the login page
2. Click "Forgot Password"
3. Enter your email address
4. Check your email for a reset link
5. Follow the link to create a new password

## Can I change my email address?

Yes, you can change it yourself in your profile settings:
- **Enter the new address** and save
- **Verify the new address** with the link emailed to it. Your current address keeps working until you do
- **Only the newest link works**, and you can request one change per minute

If the instance doesn't have email set up, the change is applied immediately. See [Changing Your Email Address](../getting-started/profile-management.md#changing-your-email-address).

## What file size limits exist for uploads?

File upload limits depend on your system configuration:
- **Individual files**: Typically 10-50 MB per file
- **Total uploads**: May have limits per incident or user
- **File types**: Restrictions on executable and potentially harmful files

Check with your event administrators for specific limits.

## Why am I getting error messages?

Common error causes and solutions:
- **Network issues**: Check your internet connection
- **Browser problems**: Try refreshing or clearing cache
- **Permission errors**: Verify you have access to the requested feature
- **Server issues**: Contact administrators if problems persist

## How do I report a bug or technical issue?

To report technical problems:
1. **Document the issue**: Note what you were doing when it occurred
2. **Include details**: Browser, device, error messages
3. **Contact support**: Use your organization's designated support channels
4. **Provide screenshots**: Visual evidence helps with troubleshooting

## Can I export my data?

Data export capabilities depend on your role and organization policies:
- **Personal data**: You may be able to export your own information
- **Incident data**: Event Admins typically have export capabilities
- **Audit logs**: May be available for compliance purposes

Contact your administrators about available export options.

## What mobile features are available?

Mobile-optimized features include:
- **Touch-friendly navigation**: Easy-to-use mobile interface
- **Camera integration**: Direct photo upload from mobile devices
- **Push notifications**: Alerts for incident updates (if configured)
- **Offline form completion**: Some forms may work with limited connectivity

## How do I clear my browser cache?

To clear cache for Conducky:
1. **Chrome**: Settings → Privacy → Clear browsing data
2. **Firefox**: Options → Privacy → Clear Data
3. **Safari**: Preferences → Privacy → Manage Website Data
4. **Edge**: Settings → Privacy → Clear browsing data

Or try using an incognito/private browsing window.

## What ports and domains need to be accessible?

For network administrators, Conducky typically requires:
- **HTTPS (port 443)**: For secure web access
- **WebSocket connections**: For real-time updates
- **CDN domains**: For static assets and performance

Contact your system administrators for specific network requirements.

## Can I use Conducky with a VPN?

Yes, Conducky should work with most VPN configurations. However:
- **Performance may vary** depending on VPN speed
- **Some corporate VPNs** may have restrictions
- **Contact IT support** if you experience connectivity issues

## What happens during system maintenance?

During scheduled maintenance:
- **Advance notice** is typically provided
- **Read-only access** may be available
- **Data is preserved** during maintenance windows
- **Service restoration** is prioritized

Check with your administrators about maintenance schedules.

## How do I optimize performance?

For better performance:
- **Use supported browsers** with latest updates
- **Clear browser cache** regularly
- **Close unnecessary tabs** to free memory
- **Check internet connection** for speed issues
- **Disable browser extensions** that might interfere

## What accessibility features are available?

Conducky includes accessibility features:
- **Keyboard navigation**: Full functionality without a mouse
- **Screen reader support**: Compatible with assistive technologies
- **High contrast options**: Better visibility for visual impairments
- **Responsive text sizing**: Adapts to browser zoom settings

Contact administrators about additional accessibility accommodations. 