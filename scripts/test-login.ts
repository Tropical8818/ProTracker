async function main() {
    const url = 'http://127.0.0.1:3000/api/auth';
    console.log(`Testing Login to ${url}...`);

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: '123' })
        });

        console.log(`Status: ${res.status} ${res.statusText}`);
        const data = await res.json();
        console.log('Response Body:', JSON.stringify(data, null, 2));

        if (res.ok && data.success) {
            console.log('✅ Login API Check PASSED');
        } else {
            console.log('❌ Login API Check FAILED');
        }
    } catch (error) {
        console.error('Network Error:', error);
    }
}

main();
