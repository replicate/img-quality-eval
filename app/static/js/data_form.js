function DataForm() {
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
            const response = await fetch('/submit-evaluation/', {
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
        <div className="container mx-auto mt-10 p-6">
            <h1 className="text-3xl font-bold mb-6">Data Form Evaluation</h1>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Replicate API Key</label>
                    <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Data (.jsonl file)</label>
                    <input
                        type="file"
                        onChange={(e) => setData(e.target.files[0])}
                        className="mt-1 block w-full"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Models</label>
                    {['ImageReward', 'Aesthetic', 'CLIP', 'BLIP', 'PickScore', 'DreamSim'].map((model) => (
                        <div key={model} className="flex items-center">
                            <input
                                type="checkbox"
                                id={model}
                                checked={models.includes(model)}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setModels([...models, model]);
                                    } else {
                                        setModels(models.filter(m => m !== model));
                                    }
                                }}
                                className="mr-2"
                            />
                            <label htmlFor={model}>{model}</label>
                        </div>
                    ))}
                </div>
                <button
                    type="submit"
                    className="bg-green-500 text-white px-4 py-2 rounded-md"
                >
                    Submit
                </button>
            </form>
        </div>
    );
}

ReactDOM.render(<DataForm />, document.getElementById('root'));
