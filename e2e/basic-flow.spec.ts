import { test, expect } from '@playwright/test';

test('basic flow: login and navigate to dashboard', async ({ page }) => {
    // 1. Navigate to login page
    await page.goto('/login');

    // 2. Fill login form
    // Assuming default credentials from README: ID: user, Password: user
    // However, I changed password logic in config but keeping it simple for default setup
    await page.fill('input[type="text"]', 'user'); // Employee ID
    await page.fill('input[type="password"]', 'user'); // Password

    // 3. Submit
    await page.click('button[type="submit"]');

    // 4. Verify redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // 5. Verify dashboard content
    await expect(page.locator('h1')).toContainText('Dashboard');
});
