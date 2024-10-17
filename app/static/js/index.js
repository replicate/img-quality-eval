function ReplicateModelForm() {
    const [apiKey, setApiKey] = React.useState('');
    const [title, setTitle] = React.useState('');
    const [promptDataset, setPromptDataset] = React.useState('parti-prompts');
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
            const response = await fetch('/generate-and-evaluate', {
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
                inputs: Object.fromEntries(group.inputs.map(input => [input.name, input.value]))
            }))
        }));
    };

    const getPrompts = () => {
        switch (promptDataset) {
            case 'parti-prompts':
                return ['Prompt 1', 'Prompt 2', 'Prompt 3']; // Replace with actual prompts
            case 'parti-prompts-tiny':
                return ['Tiny Prompt 1', 'Tiny Prompt 2']; // Replace with actual prompts
            case 'custom':
                return customPrompts.split('\n').filter(prompt => prompt.trim() !== '');
            default:
                return [];
        }
    };

    const handleAddModelGroup = () => {
        setModelGroups([...modelGroups, {
            model: '',
            promptInput: 'prompt',
            seedInput: 'seed',
            inputs: [{ name: '', value: '' }]
        }]);
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
        <div className="container mx-auto mt-10 p-6">
            <h1 className="text-3xl font-bold mb-6">Replicate Model Evaluation</h1>
            <form onSubmit={handleSubmit} className="space-y-6">
                <InputField
                    label="Replicate API Key"
                    type="password"
                    value={apiKey}
                    onChange={setApiKey}
                    required
                />
                <InputField
                    label="Title"
                    type="text"
                    value={title}
                    onChange={setTitle}
                    required
                />
                <PromptDatasetSelect
                    value={promptDataset}
                    onChange={setPromptDataset}
                />
                {promptDataset === 'custom' && (
                    <TextArea
                        label="Custom Prompts"
                        value={customPrompts}
                        onChange={setCustomPrompts}
                        rows={5}
                        required
                    />
                )}
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

function InputField({ label, type, value, onChange, required }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                required={required}
            />
        </div>
    );
}

function TextArea({ label, value, onChange, rows, required }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                rows={rows}
                required={required}
            />
        </div>
    );
}

function PromptDatasetSelect({ value, onChange }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700">Prompt Dataset</label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            >
                <option value="parti-prompts">Parti Prompts (1631 prompts)</option>
                <option value="parti-prompts-tiny">Parti Prompts Tiny (10 prompts)</option>
                <option value="custom">Custom</option>
            </select>
        </div>
    );
}

function ModelGroups({ modelGroups, onAddGroup, onRemoveGroup, onUpdateGroup, onAddInput, onRemoveInput, onUpdateInput }) {
    return (
        <div>
            <h2 className="text-xl font-semibold mb-2">Model Groups</h2>
            {modelGroups.map((group, groupIndex) => (
                <div key={groupIndex} className="border border-gray-300 rounded-md p-4 mb-4">
                    <InputField
                        label="Model"
                        type="text"
                        value={group.model}
                        onChange={(value) => onUpdateGroup(groupIndex, 'model', value)}
                        required
                    />
                    <InputField
                        label="Prompt Input Name"
                        type="text"
                        value={group.promptInput}
                        onChange={(value) => onUpdateGroup(groupIndex, 'promptInput', value)}
                        required
                    />
                    <InputField
                        label="Seed Input Name"
                        type="text"
                        value={group.seedInput}
                        onChange={(value) => onUpdateGroup(groupIndex, 'seedInput', value)}
                        required
                    />
                    <div>
                        <h3 className="text-lg font-medium mb-2">Input Values</h3>
                        {group.inputs.map((input, inputIndex) => (
                            <div key={inputIndex} className="flex space-x-2 mb-2">
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
                        ))}
                        <button
                            type="button"
                            onClick={() => onAddInput(groupIndex)}
                            className="bg-green-500 text-white px-2 py-1 rounded-md"
                        >
                            + Add Input Value
                        </button>
                    </div>
                    {groupIndex > 0 && (
                        <button
                            type="button"
                            onClick={() => onRemoveGroup(groupIndex)}
                            className="mt-2 bg-red-500 text-white px-3 py-1 rounded-md"
                        >
                            Remove Model Group
                        </button>
                    )}
                </div>
            ))}
            <button
                type="button"
                onClick={onAddGroup}
                className="bg-blue-500 text-white px-3 py-1 rounded-md"
            >
                + Add Model Group
            </button>
        </div>
    );
}

function EvaluationModels({ enabledModels, onModelChange }) {
    const allModels = ['ImageReward', 'Aesthetic', 'CLIP', 'BLIP', 'PickScore', 'DreamSim'];

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700">Evaluation Models</label>
            {allModels.map((model) => (
                <div key={model} className="flex items-center">
                    <input
                        type="checkbox"
                        id={model}
                        checked={enabledModels.includes(model)}
                        onChange={() => onModelChange(model)}
                        className="mr-2"
                    />
                    <label htmlFor={model}>{model}</label>
                </div>
            ))}
        </div>
    );
}

function SubmitButton() {
    return (
        <button
            type="submit"
            className="bg-green-500 text-white px-4 py-2 rounded-md"
        >
            Submit
        </button>
    );
}

ReactDOM.render(<ReplicateModelForm />, document.getElementById('root'));
