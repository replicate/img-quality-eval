function ResultsPage() {
    const [results, setResults] = React.useState(null);
    const [enabledModels, setEnabledModels] = React.useState([]);
    const [completed, setCompleted] = React.useState(false);
    const [modalImage, setModalImage] = React.useState(null);

    React.useEffect(() => {
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

    if (!results) {
        return <LoadingMessage />;
    }

    return (
        <div className="container mx-auto mt-10 p-6">
            <h1 className="text-3xl font-bold mb-6">Evaluation Results</h1>
            {results.map((row, rowIndex) => (
                <ResultRow
                    key={rowIndex}
                    row={row}
                    enabledModels={enabledModels}
                    setModalImage={setModalImage}
                />
            ))}
            {modalImage && (
                <ImageModal image={modalImage} onClose={() => setModalImage(null)} />
            )}
        </div>
    );
}

function LoadingMessage() {
    return <div className="text-center mt-10">Loading...</div>;
}

function ResultRow({ row, enabledModels, setModalImage }) {
    return (
        <div className="mb-8 p-4 bg-gray-100 rounded-lg">
            {row.prompt && <Prompt prompt={row.prompt} />}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {row.images.map((image, imageIndex) => (
                    <ImageCard
                        key={imageIndex}
                        image={image}
                        imageIndex={imageIndex}
                        enabledModels={enabledModels}
                        setModalImage={setModalImage}
                    />
                ))}
            </div>
        </div>
    );
}

function Prompt({ prompt }) {
    return <p className="text-lg font-semibold mb-2">{prompt}</p>;
}

function ImageCard({ image, imageIndex, enabledModels, setModalImage }) {
    return (
        <div className="bg-white p-4 rounded-lg shadow">
            <Image url={image.url} index={imageIndex} setModalImage={setModalImage} />
            <Labels labels={image.labels} genPredictionId={image.gen_prediction_id} />
            <Scores
                scores={image.scores}
                enabledModels={enabledModels}
                imageIndex={imageIndex}
            />
        </div>
    );
}

function Image({ url, index, setModalImage }) {
    if (!url) return null;
    return (
        <div
            className="aspect-square mb-2 cursor-pointer overflow-hidden"
            onClick={() => setModalImage(url)}
        >
            <img
                src={url}
                alt={`Image ${index + 1}`}
                className="w-full h-full object-cover rounded"
            />
        </div>
    );
}

function ImageModal({ image, onClose }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
            <div className="max-w-4xl max-h-full p-4">
                <img src={image} alt="Full size" className="max-w-full max-h-full object-contain" />
                <button
                    className="absolute top-4 right-4 text-white text-2xl font-bold"
                    onClick={onClose}
                >
                    ×
                </button>
            </div>
        </div>
    );
}

function Labels({ labels, genPredictionId }) {
    return (
        <div className="mb-2">
            {labels && labels.model && <ModelLabel model={labels.model} />}
            {labels && labels.predict_time && <PredictTimeLabel time={labels.predict_time} predictionId={genPredictionId} />}
            {labels && !labels.predict_time && genPredictionId && <PredictionLoading predictionId={genPredictionId} />}
            {Object.entries(labels || {})
                .filter(([key]) => key !== 'model' && key !== 'predict_time')
                .map(([key, value]) => <OtherLabel key={key} keyName={key} value={value} />)}
        </div>
    );
}

function truncateVersion(model) {
    const parts = model.split(':');
    if (parts.length === 2) {
        const [modelName, version] = parts;
        return `${modelName}:${version.slice(0, 6)}`;
    }
    return model;
}

function ModelLabel({ model }) {
    const truncatedModel = truncateVersion(model);
    const [owner, modelName] = model.split('/');
    const replicateUrl = `https://replicate.com/${owner}/${modelName}`;

    return (
        <p className="text-md font-semibold">
            <a href={replicateUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {truncatedModel}
            </a>
        </p>
    );
}

function PredictTimeLabel({ time, predictionId }) {
    const predictionUrl = `https://replicate.com/p/${predictionId}`;

    return (
        <a href={predictionUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            <p className="text-sm">
                Predict time: {' '}
                {time.toFixed(2)}s
            </p>
        </a>
    );
}

function PredictionLoading({ predictionId }) {
    const predictionUrl = `https://replicate.com/p/${predictionId}`;

    return (
        <a href={predictionUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            <p className="text-sm">
                Prediction loading...
            </p>
        </a>
    );
}

function OtherLabel({ keyName, value }) {
    return (
        <span className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2">
            {keyName}: {value.toString()}
        </span>
    );
}

function Scores({ scores, enabledModels, imageIndex }) {
    return (
        <div>
            {enabledModels.map(model => (
                (model !== "DreamSim" || imageIndex > 0) && (
                    <ScoreItem
                        key={model}
                        model={model}
                        score={scores[model]}
                    />
                )
            ))}
        </div>
    );
}

function ScoreItem({ model, score }) {
    return (
        <p className="text-sm">
            <span className="font-semibold">{model}:</span>{' '}
            {score !== null ? score.toFixed(4) : 'processing...'}
        </p>
    );
}

ReactDOM.render(<ResultsPage />, document.getElementById('root'));
