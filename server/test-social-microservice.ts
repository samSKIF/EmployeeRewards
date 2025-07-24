/**
 * Test script for social microservice
 * Run this with: npx tsx server/test-social-microservice.ts
 */
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

async function testSocialMicroservice() {
  try {
    // First, get the user token
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@demo.io',
        password: 'admin123',
      }),
    });

    if (!loginResponse.ok) {
      throw new Error('Login failed');
    }

    const loginData = await loginResponse.json();
    console.log('Login successful, token obtained');

    // Create a post without an image
    const formData = new FormData();
    formData.append(
      'content',
      'Test post from social microservice test script'
    );
    formData.append('type', 'standard');

    const textPostResponse = await fetch(
      'http://localhost:5000/api/social/posts',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${loginData.token}`,
        },
        body: formData,
      }
    );

    if (!textPostResponse.ok) {
      console.error(
        'Error response from server:',
        await textPostResponse.text()
      );
      throw new Error('Failed to create text post');
    }

    const textPostData = await textPostResponse.json();
    console.log('Created text post:', textPostData);

    // Now test with an image upload
    const form = new FormData();
    form.append('content', 'Test post with image from social microservice');

    // Try to find a test image to upload
    const testImagePath = 'server/test-image.png';
    if (fs.existsSync(testImagePath)) {
      form.append('image', fs.createReadStream(testImagePath));

      const imagePostResponse = await fetch(
        'http://localhost:5000/api/social/posts',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${loginData.token}`,
          },
          body: form,
        }
      );

      if (!imagePostResponse.ok) {
        console.error(
          'Error response from server:',
          await imagePostResponse.text()
        );
        throw new Error('Failed to create image post');
      }

      const imagePostData = await imagePostResponse.json();
      console.log('Created image post:', imagePostData);
    } else {
      console.log('Test image not found, skipping image upload test');
    }

    console.log('All tests completed successfully');
  } catch (error) {
    console.error('Error testing social microservice:', error);
  }
}

testSocialMicroservice();
