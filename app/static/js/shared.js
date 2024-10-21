function Help({ text }) {
    return (
        <p className="mb-1 text-gray-500 text-sm mt-1">{text}</p>
    );
}

function InputField({ label, help, type, value, onChange, required }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="mt-0 block w-full border border-gray-300 rounded-md shadow-sm p-2 mb-1"
                required={required}
            />
            <Help text={help} />
        </div>
    );
}

function TextArea({ label, help, value, onChange, rows, required }) {
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
            <Help text={help} />
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
    const allModels = [
        {
            name: 'CLIP',
            description: 'Measures text-image alignment using CLIP. It evaluates how well the image matches the given text prompt.',
            link: 'https://arxiv.org/abs/2103.00020'
        },
        {
            name: 'BLIP',
            description: 'Evaluates text-to-image alignment using BLIP, assessing how well the image matches the text description.',
            link: 'https://github.com/salesforce/BLIP'
        },
        {
            name: 'Aesthetic',
            description: 'Assesses the aesthetic quality of an image, predicting how visually appealing it is to humans.',
            link: 'https://github.com/christophschuhmann/improved-aesthetic-predictor'
        },
        {
            name: 'ImageReward',
            description: 'A human preference model that predicts which images humans would prefer based on the given prompt.',
            link: 'https://github.com/THUDM/ImageReward'
        },
        {
            name: 'PickScore',
            description: 'A human preference model that predicts which images humans would prefer based on the given prompt.',
            link: 'https://arxiv.org/abs/2305.01569'
        },
        {
            name: 'DreamSim',
            description: 'An image similarity metric that uses the first image per row as a reference image to compare against others.',
            link: 'https://github.com/carpedm20/dreamsim'
        }
    ];

    return (
        <div>
            <h2 className="text-xl font-semibold mb-2">Evaluation models</h2>
            {allModels.map((model) => (
                <div key={model.name} className="mb-4">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id={model.name}
                            checked={enabledModels.includes(model.name)}
                            onChange={() => onModelChange(model.name)}
                            className="mr-2"
                        />
                        <label htmlFor={model.name}>{model.name}</label>
                    </div>
                    <p className="text-sm text-gray-600 ml-6">{model.description} <a href={model.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Learn more</a></p>
                </div>
            ))}
        </div>
    );
}
