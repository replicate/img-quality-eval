function ReplicateModelForm() {
    const [apiKey, setApiKey] = React.useState('');
    const [title, setTitle] = React.useState('');
    const [promptDataset, setPromptDataset] = React.useState('parti-prompts');
    const [customPrompts, setCustomPrompts] = React.useState('');
    const [modelGroups, setModelGroups] = React.useState([{
        model: '',
        promptInputName: 'prompt',
        seedInputName: 'seed',
        inputValues: [{ name: '', value: '' }]
    }]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = {
            api_key: apiKey,
            title,
            prompt_dataset: promptDataset,
            custom_prompts: customPrompts,
            model_groups: modelGroups.map(group => ({
                model: group.model,
                prompt_input_name: group.promptInputName,
                input_values: group.inputValues.reduce((acc, curr) => {
                    acc[curr.name] = curr.value;
                    return acc;
                }, {})
            }))
        };

        try {
            const response = await fetch('/submit-replicate-model/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
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

    const addModelGroup = () => {
        const lastGroup = modelGroups[modelGroups.length - 1];
        const newGroup = {
            model: lastGroup.model,
            promptInputName: lastGroup.promptInputName,
            seedInputName: lastGroup.seedInputName,
            inputValues: lastGroup.inputValues.map(value => ({...value}))
        };
        setModelGroups([...modelGroups, newGroup]);
    };

    const removeModelGroup = (index) => {
        setModelGroups(modelGroups.filter((_, i) => i !== index));
    };

    const updateModelGroup = (index, field, value) => {
        const updatedGroups = [...modelGroups];
        updatedGroups[index][field] = value;
        setModelGroups(updatedGroups);
    };

    const addInputValue = (groupIndex) => {
        const updatedGroups = [...modelGroups];
        updatedGroups[groupIndex].inputValues.push({ name: '', value: '' });
        setModelGroups(updatedGroups);
    };

    const removeInputValue = (groupIndex, valueIndex) => {
        const updatedGroups = [...modelGroups];
        updatedGroups[groupIndex].inputValues = updatedGroups[groupIndex].inputValues.filter((_, i) => i !== valueIndex);
        setModelGroups(updatedGroups);
    };

    const updateInputValue = (groupIndex, valueIndex, field, value) => {
        const updatedGroups = [...modelGroups];
        updatedGroups[groupIndex].inputValues[valueIndex][field] = value;
        setModelGroups(updatedGroups);
    };

    return (
        <div className="container mx-auto mt-10 p-6">
            <h1 className="text-3xl font-bold mb-6">Replicate Model Evaluation</h1>
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
                    <label className="block text-sm font-medium text-gray-700">Prompt Dataset</label>
                    <select
                        value={promptDataset}
                        onChange={(e) => setPromptDataset(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    >
                        <option value="parti-prompts">Parti Prompts (1631 prompts)</option>
                        <option value="parti-prompts-tiny">Parti Prompts Tiny (10 prompts)</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>
                {promptDataset === 'custom' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Custom Prompts</label>
                        <textarea
                            value={customPrompts}
                            onChange={(e) => setCustomPrompts(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            rows="5"
                            required
                        />
                    </div>
                )}
                <div>
                    <h2 className="text-xl font-semibold mb-2">Model Groups</h2>
                    {modelGroups.map((group, groupIndex) => (
                        <div key={groupIndex} className="border border-gray-300 rounded-md p-4 mb-4">
                            <div className="mb-2">
                                <label className="block text-sm font-medium text-gray-700">Model</label>
                                <input
                                    type="text"
                                    value={group.model}
                                    onChange={(e) => updateModelGroup(groupIndex, 'model', e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    required
                                />
                            </div>
                            <div className="mb-2">
                                <label className="block text-sm font-medium text-gray-700">Prompt Input Name</label>
                                <input
                                    type="text"
                                    value={group.promptInputName}
                                    onChange={(e) => updateModelGroup(groupIndex, 'promptInputName', e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    required
                                />
                            </div>
                            <div className="mb-2">
                                <label className="block text-sm font-medium text-gray-700">Seed Input Name</label>
                                <input
                                    type="text"
                                    value={group.seedInputName}
                                    onChange={(e) => updateModelGroup(groupIndex, 'seedInputName', e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    required
                                />
                            </div>

                            <div>
                                <h3 className="text-lg font-medium mb-2">Input Values</h3>
                                {group.inputValues.map((value, valueIndex) => (
                                    <div key={valueIndex} className="flex space-x-2 mb-2">
                                        <input
                                            type="text"
                                            value={value.name}
                                            onChange={(e) => updateInputValue(groupIndex, valueIndex, 'name', e.target.value)}
                                            className="flex-1 border border-gray-300 rounded-md shadow-sm p-2"
                                            placeholder="Name"
                                        />
                                        <input
                                            type="text"
                                            value={value.value}
                                            onChange={(e) => updateInputValue(groupIndex, valueIndex, 'value', e.target.value)}
                                            className="flex-1 border border-gray-300 rounded-md shadow-sm p-2"
                                            placeholder="Value"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeInputValue(groupIndex, valueIndex)}
                                            className="bg-red-500 text-white px-2 py-1 rounded-md"
                                        >
                                            -
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => addInputValue(groupIndex)}
                                    className="bg-green-500 text-white px-2 py-1 rounded-md"
                                >
                                    + Add Input Value
                                </button>
                            </div>
                            {groupIndex > 0 && (
                                <button
                                    type="button"
                                    onClick={() => removeModelGroup(groupIndex)}
                                    className="mt-2 bg-red-500 text-white px-3 py-1 rounded-md"
                                >
                                    Remove Model Group
                                </button>
                            )}
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={addModelGroup}
                        className="bg-blue-500 text-white px-3 py-1 rounded-md"
                    >
                        + Add Model Group
                    </button>
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

ReactDOM.render(<ReplicateModelForm />, document.getElementById('root'));
