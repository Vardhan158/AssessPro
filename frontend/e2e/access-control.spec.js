import { test, expect } from '@playwright/test';

test.describe('Public access and authentication boundaries', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Student Assessment Portal')).toBeVisible();
  });

  for (const route of [
    '/student/dashboard', '/student/profile', '/student/instructions/example',
    '/student/exam/example', '/student/submission/example', '/student/results/example',
    '/admin/dashboard', '/admin/students', '/admin/questions', '/admin/assessments',
    '/admin/schedule', '/admin/monitoring', '/admin/incidents', '/admin/results',
    '/admin/reports', '/admin/assessments/example', '/super-admin/dashboard'
  ]) {
    test(`anonymous visitor cannot access ${route}`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login$/);
    });
  }

  test('public registration API is disabled', async ({ request }) => {
    const response = await request.post(
      `${process.env.E2E_API_URL || 'http://localhost:5000/api/v1'}/auth/register`,
      { data: { email: 'qa@example.invalid', password: 'NotARealPassword123!' } }
    );
    expect(response.status()).toBe(403);
  });

  for (const endpoint of ['/student/dashboard', '/admin/candidates', '/admin/platform/users']) {
    test(`unauthenticated API denied: ${endpoint}`, async ({ request }) => {
      const response = await request.get(
        `${process.env.E2E_API_URL || 'http://localhost:5000/api/v1'}${endpoint}`
      );
      expect(response.status()).toBe(401);
    });
  }
});
