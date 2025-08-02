export default function DebugPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Deployment Debug</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Environment Check</h2>
          <div className="space-y-2 text-sm">
            <div>
              <strong>NODE_ENV:</strong> {process.env.NODE_ENV || 'not set'}
            </div>
            <div>
              <strong>AWS_REGION:</strong> {process.env.AWS_REGION || 'not set'}
            </div>
            <div>
              <strong>DEFISO_AWS_REGION:</strong> {process.env.DEFISO_AWS_REGION || 'not set'}
            </div>
            <div>
              <strong>DEFISO_ACCESS_KEY_ID:</strong> {process.env.DEFISO_ACCESS_KEY_ID ? 'SET' : 'NOT SET'}
            </div>
            <div>
              <strong>DEFISO_SECRET_ACCESS_KEY:</strong> {process.env.DEFISO_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET'}
            </div>
            <div>
              <strong>USE_DYNAMODB:</strong> {process.env.USE_DYNAMODB || 'not set'}
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">DynamoDB Test</h2>
          <button 
            onClick={async () => {
              try {
                const response = await fetch('/api/debug-dynamodb');
                const data = await response.json();
                console.log('DynamoDB Test Result:', data);
                alert(JSON.stringify(data, null, 2));
              } catch (error) {
                console.error('Test failed:', error);
                alert('Test failed: ' + error);
              }
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Test DynamoDB Connection
          </button>
        </div>
      </div>
    </div>
  );
}
