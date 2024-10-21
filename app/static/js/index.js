function ReplicateModelForm() {
    const [apiKey, setApiKey] = React.useState('');
    const [title, setTitle] = React.useState('');
    const [promptDataset, setPromptDataset] = React.useState('parti-prompts-tiny');
    const [customPrompts, setCustomPrompts] = React.useState('');
    const [modelGroups, setModelGroups] = React.useState([{
        model: '',
        promptInput: 'prompt',
        seedInput: 'seed',
        inputs: [{ name: '', value: '' }]
    }]);
    const [enabledModels, setEnabledModels] = React.useState(['ImageReward', 'Aesthetic', 'CLIP', 'BLIP', 'PickScore', 'DreamSim']);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = {
            api_key: apiKey,
            title,
            rows: generateRows(),
            eval_models: enabledModels
        };

        try {
            const response = await fetch('/api/generate-and-evaluate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });
            if (response.ok) {
                const data = await response.json();
                window.location.href = data.results_url;
            } else {
                const error = await response.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    const generateRows = () => {
        const prompts = getPrompts();
        return prompts.map(prompt => ({
            prompt,
            examples: modelGroups.map(group => ({
                model: group.model,
                prompt_input: group.promptInput,
                seed_input: group.seedInput,
                inputs: duckTypeInputs(Object.fromEntries(group.inputs.map(input => [input.name, input.value])))
            }))
        }));
    };

    const duckTypeInputs = (inputs) => {
        const duckTypedInputs = {};
        for (const [key, value] of Object.entries(inputs)) {
            if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
                duckTypedInputs[key] = value.toLowerCase() === 'true';
            } else if (!isNaN(value) && value.trim() !== '') {
                duckTypedInputs[key] = Number(value);
            } else {
                duckTypedInputs[key] = value;
            }
        }
        return duckTypedInputs;
    };

    const getPrompts = () => {
        switch (promptDataset) {
        case 'parti-prompts':
            return window.PARTI_PROMPTS;
        case 'parti-prompts-tiny':
            return window.PARTI_PROMPTS_TINY;
        case 'custom':
            return customPrompts.split('\n').filter(prompt => prompt.trim() !== '');
        default:
            return [];
        }
    };

    const handleAddModelGroup = () => {
        const lastGroup = modelGroups[modelGroups.length - 1];
        const newGroup = {
            model: lastGroup.model,
            promptInput: lastGroup.promptInput,
            seedInput: lastGroup.seedInput,
            inputs: lastGroup.inputs.map(input => ({ ...input }))
        };
        setModelGroups([...modelGroups, newGroup]);
    };

    const handleRemoveModelGroup = (index) => {
        setModelGroups(modelGroups.filter((_, i) => i !== index));
    };

    const handleUpdateModelGroup = (index, field, value) => {
        const updatedGroups = [...modelGroups];
        updatedGroups[index][field] = value;
        setModelGroups(updatedGroups);
    };

    const handleAddInput = (groupIndex) => {
        const updatedGroups = [...modelGroups];
        updatedGroups[groupIndex].inputs.push({ name: '', value: '' });
        setModelGroups(updatedGroups);
    };

    const handleRemoveInput = (groupIndex, inputIndex) => {
        const updatedGroups = [...modelGroups];
        updatedGroups[groupIndex].inputs = updatedGroups[groupIndex].inputs.filter((_, i) => i !== inputIndex);
        setModelGroups(updatedGroups);
    };

    const handleUpdateInput = (groupIndex, inputIndex, field, value) => {
        const updatedGroups = [...modelGroups];
        updatedGroups[groupIndex].inputs[inputIndex][field] = value;
        setModelGroups(updatedGroups);
    };

    const handleModelChange = (model) => {
        setEnabledModels(prevModels =>
            prevModels.includes(model)
                ? prevModels.filter(m => m !== model)
                : [...prevModels, model]
        );
    };

    return (
        <div className="container mx-auto mt-10 px-0 max-w-3xl">
            <p className="mb-1">Generate images using Replicate text-to-image models and evaluate their quality with <a target="_blank" href="https://replicate.com/andreasjansson/flash-eval">FlashEval</a> and <a target="_blank" href="https://replicate.com/andreasjansson/dreamsim">DreamSim</a>. </p>
            <p className="mb-5">For example, <a target="_blank" href="https://img-quality-eval.onrender.com/results/124bd52a-c9cf-4300-8838-c6c798451310/">this evaluation</a> compares <a target="_blank" href="https://replicate.com/black-forest-labs/flux-1.1-pro">black-forest-labs/flux-1.1-pro</a>, <a target="_blank" href="https://replicate.com/black-forest-labs/flux-dev">black-forest-labs/flux-dev</a> and <a target="_blank" href="https://replicate.com/black-forest-labs/flux-schnell">black-forest-labs/flux-schnell</a> using parti-prompts-tiny.</p>
            <form onSubmit={handleSubmit} className="space-y-6">
                <InputField
                    label="Replicate API key"
                    help="Your Replicate API token."
                    type="password"
                    value={apiKey}
                    onChange={setApiKey}
                    required
                />
                <InputField
                    label="Evaluation title"
                    help="This will be displayed on the results page."
                    type="text"
                    value={title}
                    onChange={setTitle}
                    required
                />
                <PromptDatasetSelect
                    promptDataset={promptDataset}
                    setPromptDataset={setPromptDataset}
                    customPrompts={customPrompts}
                    setCustomPrompts={setCustomPrompts}
                />
                <ModelGroups
                    modelGroups={modelGroups}
                    onAddGroup={handleAddModelGroup}
                    onRemoveGroup={handleRemoveModelGroup}
                    onUpdateGroup={handleUpdateModelGroup}
                    onAddInput={handleAddInput}
                    onRemoveInput={handleRemoveInput}
                    onUpdateInput={handleUpdateInput}
                />
                <EvaluationModels
                    enabledModels={enabledModels}
                    onModelChange={handleModelChange}
                />
                <SubmitButton />
            </form>
        </div>
    );
}

function PromptDatasetSelect({ promptDataset, setPromptDataset, customPrompts, setCustomPrompts }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700">Prompt dataset</label>
            <select
                value={promptDataset}
                onChange={(e) => setPromptDataset(e.target.value)}
                className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
            >
                <option value="parti-prompts">parti-prompts (1631 prompts)</option>
                <option value="parti-prompts-tiny">parti-prompts-tiny (10 prompts)</option>
                <option value="custom">Custom</option>
            </select>
            {promptDataset === 'custom' ? (
                <TextArea
                    label="Custom prompts"
                    value={customPrompts}
                    onChange={setCustomPrompts}
                    rows={5}
                    required
                />
            ) : (
                <p className="mb-1 text-gray-500 text-sm mt-1">
                    List or prompts to run on all models. <a href="https://huggingface.co/datasets/nateraw/parti-prompts">parti-prompts</a> is a dataset of 1631 prompts of various complexity. parti-prompts-tiny is a 10 prompt subset of parti-prompts. You can also enter custom prompts by selecting "Custom".
                </p>
            )}
        </div>
    );
}

function ModelGroups({ modelGroups, onAddGroup, onRemoveGroup, onUpdateGroup, onAddInput, onRemoveInput, onUpdateInput }) {
    return (
        <div>
            <h2 className="text-xl font-semibold mb-2">Models</h2>
            <p className="mb-1 text-gray-500 text-sm mt-1">One or more models to generate images with. Every prompt in the prompt dataset above will be run on every model in the list below. The same model can be repeated multiple times, when you may want to evaluate different input settings.</p>
            {modelGroups.map((group, groupIndex) => (
                <div key={groupIndex} className="border border-gray-300 rounded-md p-4 mb-4">
                    <InputField
                        label="Model"
                        help="Replicate model in the format <owner>/<model>[:<version>], e.g. black-forest-labs/flux-dev."
                        type="text"
                        value={group.model}
                        onChange={(value) => onUpdateGroup(groupIndex, 'model', value)}
                        required
                    />
                    <InputField
                        label="Prompt input name"
                        help="The name of the prompt input to the model."
                        type="text"
                        value={group.promptInput}
                        onChange={(value) => onUpdateGroup(groupIndex, 'promptInput', value)}
                        required
                    />
                    <InputField
                        label="Seed input name"
                        help="The name of the seed input to the model."
                        type="text"
                        value={group.seedInput}
                        onChange={(value) => onUpdateGroup(groupIndex, 'seedInput', value)}
                        required
                    />
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Model inputs</label>
                        {group.inputs.map((input, inputIndex) => (
                            <div className="mb-3">
                                <div key={inputIndex} className="flex space-x-2">
                                    <input
                                        type="text"
                                        value={input.name}
                                        onChange={(e) => onUpdateInput(groupIndex, inputIndex, 'name', e.target.value)}
                                        className="flex-1 border border-gray-300 rounded-md shadow-sm p-2"
                                        placeholder="Name"
                                    />
                                    <input
                                        type="text"
                                        value={input.value}
                                        onChange={(e) => onUpdateInput(groupIndex, inputIndex, 'value', e.target.value)}
                                        className="flex-1 border border-gray-300 rounded-md shadow-sm p-2"
                                        placeholder="Value"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => onRemoveInput(groupIndex, inputIndex)}
                                        className="bg-red-500 text-white px-2 py-1 rounded-md"
                                    >
                                        -
                                    </button>
                                </div>
                                {inputIndex == group.inputs.length - 1 && (
                                    <Help text="Input names and values to this model. This is useful if you want to evaluate different model parameters." />
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => onAddInput(groupIndex)}
                            className="bg-green-500 text-white px-2 py-1 rounded-md"
                        >
                            + Add input value
                        </button>
                    </div>
                    {groupIndex > 0 && (
                        <button
                            type="button"
                            onClick={() => onRemoveGroup(groupIndex)}
                            className="mt-2 bg-red-500 text-white px-3 py-1 rounded-md"
                        >
                            Remove model
                        </button>
                    )}
                </div>
            ))}
            <button
                type="button"
                onClick={onAddGroup}
                className="bg-blue-500 text-white px-3 py-1 rounded-md"
            >
                + Add model
            </button>
        </div>
    );
}

ReactDOM.render(<ReplicateModelForm />, document.getElementById('root'));
