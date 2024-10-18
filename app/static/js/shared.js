function InputField({ label, type, value, onChange, required }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="mt-0 block w-full border border-gray-300 rounded-md shadow-sm p-2 mb-3"
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

function SubmitButton({ text = "Submit" }) {
    return (
        <button
            type="submit"
            className="bg-green-500 text-white px-4 py-2 rounded-md"
        >
            {text}
        </button>
    );
}

function EvaluationModels({ enabledModels, onModelChange }) {
    const allModels = ['ImageReward', 'Aesthetic', 'CLIP', 'BLIP', 'PickScore', 'DreamSim'];

    return (
        <div>
            <h2 className="text-xl font-semibold mb-2">Evaluation models</h2>
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
