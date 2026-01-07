# DNS Setup for Email Forwarding

To set up `contact@davidalisk.com` forwarding to `david.lisk@stern.nyu.edu`, you need to add the following records to your domain's DNS settings (likely in Namecheap or wherever you bought the domain).

**Note:** Do NOT change your existing A or CNAME records for GitHub Pages. Only add/modify the records below.

## 1. MX Records (for ImprovMX)

These records direct email to the forwarding service.

| Type | Host | Value | Priority |
| :--- | :--- | :--- | :--- |
| MX | @ | mx1.improvmx.com | 10 |
| MX | @ | mx2.improvmx.com | 20 |

## 2. SPF Record (TXT)

This authorizes ImprovMX to send/forward email for your domain.

| Type | Host | Value |
| :--- | :--- | :--- |
| TXT | @ | v=spf1 include:spf.improvmx.com ~all |

*If you already have an SPF record (starts with `v=spf1`), just add `include:spf.improvmx.com` to it.*

## 3. DMARC Record (TXT)

This sets the policy for email authentication.

| Type | Host | Value |
| :--- | :--- | :--- |
| TXT | _dmarc | v=DMARC1; p=none; rua=mailto:postmaster@davidalisk.com |

## Next Steps

1.  Log in to your domain registrar.
2.  Add the records above.
3.  Go to [ImprovMX](https://improvmx.com/).
4.  Enter your domain (`davidalisk.com`) and your email (`david.lisk@stern.nyu.edu`).
5.  Verify the setup in their dashboard.
