# Backend Configuration & Instructions

## Admin Credentials
- **Email**: roketamarket19@gmail.com
- **Password**: R0k3tm4rk3t
- **Role**: admin

## Instructions
- This user is the primary administrator of the TryoutPro system.
- All new migrations or features should consider this user as the default admin.
- Ensure `user_roles` table contains the `'admin'` role for this user ID.

## Security Note
- Keep this repository private as it contains administrative credentials.
- In production, it is recommended to use environment variables for sensitive data, but this file serves as the requested "secure backend prompt" context.
