function EvaluationForm() {
    const [apiKey, setApiKey] = React.useState('');
    const [title, setTitle] = React.useState('');
    const [data, setData] = React.useState(null);
    const [models, setModels] = React.useState(['ImageReward', 'Aesthetic', 'CLIP', 'BLIP', 'PickScore', 'DreamSim']);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('api_key', apiKey);
        formData.append('title', title);
        formData.append('data', data);
        models.forEach(model => formData.append('models', model));

        try {
            const response = await fetch('/submit/', {
                method: 'POST',
                body: formData,
            });
            if (response.ok) {
                window.location.href = response.url;
            } else {
                const error = await response.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-lg bg-white mx-auto mt-10 p-6 bg-white rounded-lg shadow-xl">
            <h1 className="text-2xl font-bold mb-6">Image Quality Evaluation</h1>
            <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="api-key">
                    Replicate API Key
                </label>
                <input
                    id="api-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                />
                <p className="text-sm text-gray-600 mt-1">Your secret Replicate API key for authentication.</p>
            </div>
            <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">
                    Title
                </label>
                <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                />
                <p className="text-sm text-gray-600 mt-1">A descriptive title for this evaluation.</p>
            </div>

            <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="data">
                    Data (.jsonl file)
                </label>
                <input
                    id="data"
                    type="file"
                    onChange={(e) => setData(e.target.files[0])}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                />
                <div className="text-sm text-gray-600 mt-1">
                    <p>Upload a JSONL file containing prompts and image URLs for evaluation. Each line should be a JSON object with the following format:</p>
                    <pre className="bg-gray-100 p-2 mt-1 rounded overflow-x-auto">
                        {`{"prompt": "<optional prompt>", "images": [{"url": "<image1-url>", "labels": { ... }}, ...]}`}
                    </pre>
                    <p className="mt-1">
                        - The "prompt" field is optional but must be consistent (all rows have it or none do).
                        <br />
                        - Each image object must have a "url" and can have optional "labels".
                        <br />
                        - For DreamSim, the first image in each row will be treated as the reference image.
                    </p>
                </div>
            </div>


            <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                    Models
                </label>
                <p className="text-sm text-gray-600 mb-2">Select one or more models to evaluate the images:</p>
                {['ImageReward', 'Aesthetic', 'CLIP', 'BLIP', 'PickScore', 'DreamSim'].map((model) => (
                    <div key={model} className="mb-2">
                        <label className="inline-flex items-center">
                            <input
                                type="checkbox"
                                value={model}
                                checked={models.includes(model)}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setModels([...models, model]);
                                    } else {
                                        setModels(models.filter(m => m !== model));
                                    }
                                }}
                                className="form-checkbox h-5 w-5 text-blue-600"
                            />
                            <span className="ml-2 text-gray-700">{model}</span>
                        </label>
                    </div>
                ))}
                <p className="text-sm text-gray-600 mt-1">
                    Note: DreamSim uses the first image as a reference. Other models require prompts.
                </p>
            </div>
            <div className="flex items-center justify-between">
                <button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                    Submit
                </button>
            </div>
        </form>
    );
}

ReactDOM.render(<EvaluationForm />, document.getElementById('root'));
