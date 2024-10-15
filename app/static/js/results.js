function ResultsPage() {
    const [results, setResults] = React.useState(null);
    const [enabledModels, setEnabledModels] = React.useState([]);
    const [completed, setCompleted] = React.useState(false);

    React.useEffect(() => {
        const fetchResults = async () => {
            try {
                const response = await fetch(`/api/results/${evalId}/`);
                if (response.ok) {
                    const data = await response.json();
                    setResults(data.data);
                    setEnabledModels(data.enabled_models || []);
                    setCompleted(data.completed);
                } else {
                    console.error('Failed to fetch results');
                }
            } catch (error) {
                console.error('Error fetching results:', error);
            }
        };

        fetchResults();
        const intervalId = setInterval(() => {
            if (completed) {
                clearInterval(intervalId);
            } else {
                fetchResults();
            }
        }, 5000);  // Poll every 5 seconds

        return () => clearInterval(intervalId);
    }, [completed]);

    if (!results) {
        return <div className="text-center mt-10">Loading...</div>;
    }

    return (
        <div className="container mx-auto mt-10 p-6">
            <h1 className="text-3xl font-bold mb-6">Evaluation Results</h1>
            {results.map((row, rowIndex) => (
                <div key={rowIndex} className="mb-8 p-4 bg-gray-100 rounded-lg">
                    {row.prompt && (
                        <p className="text-lg font-semibold mb-2">Prompt: {row.prompt}</p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {row.images.map((image, imageIndex) => (
                            <div key={imageIndex} className="bg-white p-4 rounded-lg shadow">
                                {image.url && <img src={image.url} alt={`Image ${imageIndex + 1}`} className="w-full h-48 object-cover mb-2 rounded" />}
                                <div className="mb-2">
                                    {Object.entries(image.labels || {}).map(([key, value]) => (
                                        <span key={key} className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2">
                                            {key}: {value.toString()}
                                        </span>
                                    ))}
                                </div>
                                <div>
                                    {enabledModels.map(model => (
                                        <p key={model} className="text-sm">
                                            <span className="font-semibold">{model}:</span> {
                                                image.scores[model] !== null
                                                    ? image.scores[model].toFixed(4)
                                                    : 'processing...'
                                            }
                                        </p>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

ReactDOM.render(<ResultsPage />, document.getElementById('root'));
