function EvaluationsList() {
    const [apiKey, setApiKey] = React.useState('');
    const [evaluations, setEvaluations] = React.useState(null);
    const [error, setError] = React.useState(null);

    const fetchEvaluations = async () => {
        try {
            const response = await fetch('/api/evaluations/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ api_key: apiKey }),
            });

            if (response.ok) {
                const data = await response.json();
                setEvaluations(data.evaluations);
                setError(null);
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to fetch evaluations');
            }
        } catch (err) {
            setError('Failed to fetch evaluations');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        fetchEvaluations();
    };

    return (
        <div className="container mx-auto mt-10 px-0 max-w-3xl">
            <form onSubmit={handleSubmit} className="mb-8">
                <InputField
                    label="Replicate API Key"
                    help="Enter your Replicate API key to view your evaluations"
                    type="password"
                    value={apiKey}
                    onChange={setApiKey}
                    required
                />
                <button
                    type="submit"
                    className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md"
                >
                    View Evaluations
                </button>
            </form>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {evaluations && (
                <div>
                    <h2 className="text-2xl font-bold mb-4">Your Evaluations</h2>
                    {evaluations.length === 0 ? (
                        <p>No evaluations found.</p>
                    ) : (
                        <div className="grid gap-4">
                            {evaluations.map((evaluation) => (
                                <EvaluationCard key={evaluation.eval_id} evaluation={evaluation} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function EvaluationCard({ evaluation }) {
    const formattedDate = new Date(evaluation.created_at).toLocaleString();

    return (
        <div className="border border-gray-300 rounded-lg p-4 hover:shadow-md transition-shadow">
            <h3 className="text-xl font-semibold mb-2">
                <a
                    href={`/results/${evaluation.eval_id}/`}
                    className="text-blue-600 hover:underline"
                >
                    {evaluation.title}
                </a>
            </h3>
            <p className="text-sm text-gray-600 mb-2">Created: {formattedDate}</p>
            <p className="text-md text-gray-600 mb-2">{evaluation.num_rows} rows</p>
            <div className="flex flex-wrap gap-2">
                {evaluation.enabled_models.map((model) => (
                    <span
                        key={model}
                        className="bg-gray-200 px-2 py-1 rounded-full text-sm"
                    >
                        {model}
                    </span>
                ))}
            </div>
        </div>
    );
}

ReactDOM.render(<EvaluationsList />, document.getElementById('root'));
