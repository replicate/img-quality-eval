function DataForm() {
    const [apiKey, setApiKey] = React.useState('');
    const [title, setTitle] = React.useState('');
    const [data, setData] = React.useState(null);
    const [models, setModels] = React.useState(['ImageReward', 'Aesthetic', 'CLIP', 'BLIP', 'PickScore', 'DreamSim']);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const reader = new FileReader();
        reader.onload = async (event) => {
            const fileContent = event.target.result;
            const jsonlData = fileContent.split('\n').filter(line => line.trim()).map(JSON.parse);

            const requestData = {
                api_key: apiKey,
                title: title,
                data: jsonlData,
                eval_models: models,
            };

            try {
                const response = await fetch('/api/evaluate-images', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestData),
                });
                if (response.ok) {
                    const result = await response.json();
                    window.location.href = result.results_url;
                } else {
                    const error = await response.json();
                    alert(`Error: ${error.error}`);
                }
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        };
        reader.readAsText(data);
    };

    return (
        <div className="container mx-auto mt-10 px-0 max-w-3xl">
            <p className="mb-1">Upload a list of existing image URLs and evaluate their quality with <a target="_blank" href="https://github.com/thu-nics/FlashEval">FlashEval</a> and <a target="_blank" href="https://github.com/carpedm20/dreamsim">DreamSim</a>. </p>
            <p className="mb-5">For example, <a target="_blank" href="https://img-quality-eval.onrender.com/results/20cabfbe-64a5-45cb-8213-103caa6346c6/">this evaluation</a> was created using <a target="_blank" href="https://gist.githubusercontent.com/andreasjansson/4ca66c90c17e5b46293555ae3ea06ae0/raw/94724e11a75418cdf5b12e208b3f0b650cca54a3/img-quality-eval-test-data.json">this jsonl data</a>.</p>
            <form onSubmit={handleSubmit} className="space-y-6">
                <InputField
                    label="Replicate API Key"
                    help="Your Replicate API token. This is required to use the evaluation models."
                    type="password"
                    value={apiKey}
                    onChange={setApiKey}
                    required
                />
                <InputField
                    label="Title"
                    help="A title for this evaluation. This will be displayed on the results page."
                    type="text"
                    value={title}
                    onChange={setTitle}
                    required
                />
                <div>
                    <label className="block text-sm font-medium text-gray-700">Data (.jsonl file)</label>
                    <input
                        type="file"
                        onChange={(e) => setData(e.target.files[0])}
                        className="mt-0 block w-full"
                        required
                    />
                    <Help text='Upload a JSONL file containing the image data to evaluate. Each line should be a JSON object with a "prompt" (optional) and an "images" array of objects with "url" and optional "labels". Example row: {"prompt": "A beautiful sunset", "images": [{"url": "https://example.com/image1.jpg", "labels": {"model": "stable-diffusion"}}, {"url": "https://example.com/image2.jpg", "labels": {"model": "dalle-2"}}]}' />
                </div>
                <EvaluationModels
                    enabledModels={models}
                    onModelChange={(model) => {
                        if (models.includes(model)) {
                            setModels(models.filter(m => m !== model));
                        } else {
                            setModels([...models, model]);
                        }
                    }}
                />
                <SubmitButton />
            </form>
        </div>
    );
}

ReactDOM.render(<DataForm />, document.getElementById('root'));
