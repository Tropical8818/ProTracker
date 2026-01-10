# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - img [ref=e7]
      - heading "iProTraX V7.0.0" [level=1] [ref=e10]
      - paragraph [ref=e11]: Sign in to your account
    - generic [ref=e12]:
      - generic [ref=e13]:
        - textbox "Employee ID" [ref=e14]: admin
        - img [ref=e15]
      - generic [ref=e17]:
        - textbox "Password" [ref=e18]: admin123
        - img [ref=e19]
        - button [ref=e22]:
          - img [ref=e23]
      - generic [ref=e26]: Invalid credentials
      - button "Login" [ref=e27]:
        - img [ref=e28]
        - text: Login
    - link "Don't have an account? Create one" [ref=e32] [cursor=pointer]:
      - /url: /register
  - button "Open Next.js Dev Tools" [ref=e38] [cursor=pointer]:
    - img [ref=e39]
  - alert [ref=e42]
```