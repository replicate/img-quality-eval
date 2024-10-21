function ResultsPage() {
    const [title, setTitle] = React.useState(null);
    const [results, setResults] = React.useState(null);
    const [enabledModels, setEnabledModels] = React.useState([]);
    const [completed, setCompleted] = React.useState(false);
    const [modalImage, setModalImage] = React.useState(null);
    const [currentRowIndex, setCurrentRowIndex] = React.useState(0);
    const [currentImageIndex, setCurrentImageIndex] = React.useState(0);

    const handleKeyDown = (event) => {
        if (modalImage) {
            if (event.key === 'ArrowLeft') {
                navigateImage(-1);
            } else if (event.key === 'ArrowRight') {
                navigateImage(1);
            } else if (event.key === 'Escape') {
                setModalImage(null);
            }
        }
    };

    React.useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [modalImage, currentRowIndex, currentImageIndex]);

    const navigateImage = (direction) => {
        if (!results) return;

        let newRowIndex = currentRowIndex;
        let newImageIndex = currentImageIndex + direction;

        if (newImageIndex < 0) {
            newRowIndex--;
            if (newRowIndex < 0) {
                newRowIndex = results.length - 1;
            }
            newImageIndex = results[newRowIndex].images.length - 1;
        } else if (newImageIndex >= results[newRowIndex].images.length) {
            newRowIndex++;
            if (newRowIndex >= results.length) {
                newRowIndex = 0;
            }
            newImageIndex = 0;
        }

        setCurrentRowIndex(newRowIndex);
        setCurrentImageIndex(newImageIndex);
        setModalImage(results[newRowIndex].images[newImageIndex].url);
    };

    const fetchResults = async () => {
        try {
            const response = await fetch(`/api/results/${evalId}/`);
            if (response.ok) {
                const data = await response.json();
                setTitle(data.title);
                setResults(data.rows);
                setEnabledModels(data.enabled_models || []);
                setCompleted(data.completed);

                if (!data.completed) {
                    setTimeout(() => {
                        fetchResults();
                    }, 5000);  // Poll every 5 seconds
                }
            } else {
                console.error('Failed to fetch results');
            }

        } catch (error) {
            console.error('Error fetching results:', error);
        }

    };

    const selectImage = (imageUrl, rowIndex, imageIndex) => {
        setModalImage(imageUrl);
        if (imageUrl) {
            setCurrentRowIndex(rowIndex);
            setCurrentImageIndex(imageIndex);
        }
    };

    React.useEffect(() => {
        fetchResults();
    }, []);

    if (!results) {
        return <LoadingMessage />;
    }

    return (
        <div className="container mx-auto mt-0 p-0">
            <h1 className="text-3xl font-bold mb-6">{title}</h1>
            {results.map((row, rowIndex) => (
                <ResultRow
                    key={rowIndex}
                    row={row}
                    enabledModels={enabledModels}
                    selectImage={selectImage}
                    rowIndex={rowIndex}
                />
            ))}
            {modalImage && (
                <ImageModal
                    image={modalImage}
                    onClose={() => selectImage(null)}
                    onNavigate={navigateImage}
                />
            )}
        </div>
    );
}

function LoadingMessage() {
    return <div className="text-center mt-10">Loading...</div>;
}

function ResultRow({ row, enabledModels, selectImage, rowIndex }) {
    return (
        <div className="mb-8 p-4 border-gray-300 border rounded-lg">
            {row.prompt && <Prompt prompt={row.prompt} seed={row.seed} />}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {row.images.map((image, imageIndex) => (
                    <ImageCard
                        key={imageIndex}
                        image={image}
                        imageIndex={imageIndex}
                        enabledModels={enabledModels}
                        selectImage={selectImage}
                        rowIndex={rowIndex}
                    />
                ))}
            </div>
        </div>
    );
}

function Prompt({ prompt, seed }) {
    return (
        <div>
            <p className="text-lg font-semibold mb-0">{prompt}</p>
            {seed !== null && (<p className="text-sm text-gray-600 font-semibold mb-2">Seed: {seed}</p>)}
        </div>
    );
}

function ImageCard({ image, imageIndex, enabledModels, selectImage, rowIndex }) {
    return (
        <div className="bg-white p-4 rounded-lg shadow-sm">
            <Image url={image.url} index={imageIndex} onClick={() => selectImage(image.url, rowIndex, imageIndex)} />
            <Labels labels={image.labels} genModel={image.gen_model} genPredictionId={image.gen_prediction_id} />
            <Scores
                scores={image.scores}
                enabledModels={enabledModels}
                imageIndex={imageIndex}
            />
        </div>
    );
}

function Image({ url, index, onClick }) {
    if (!url) return null;
    return (
        <div
            className="aspect-square mb-2 cursor-pointer overflow-hidden"
            onClick={onClick}
        >
            <img
                src={url}
                alt={`Image ${index + 1}`}
                className="w-full h-full object-cover rounded"
            />
        </div>
    );
}

function ImageModal({ image, onClose, onNavigate }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
            <div className="max-w-4xl max-h-full p-4 relative">
                <img src={image} alt="Full size" className="max-w-full max-h-full object-contain" />
                <button
                    className="absolute top-4 right-4 text-white text-2xl font-bold"
                    onClick={onClose}
                >
                    ×
                </button>
                <button
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white text-4xl font-bold"
                    onClick={(e) => { e.stopPropagation(); onNavigate(-1); }}
                >
                    &#8592;
                </button>
                <button
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white text-4xl font-bold"
                    onClick={(e) => { e.stopPropagation(); onNavigate(1); }}
                >
                    &#8594;
                </button>
            </div>
        </div>
    );
}

function Labels({ labels, genModel, genPredictionId }) {
    return (
        <div className="mb-2">
            {genModel && <ModelLabel model={genModel} />}
            {labels && labels.predict_time && <PredictTimeLabel time={labels.predict_time} predictionId={genPredictionId} />}
            {labels && !labels.predict_time && genPredictionId && <PredictionLoading predictionId={genPredictionId} />}
            {Object.entries(labels || {})
                .filter(([key]) => key !== 'model' && key !== 'predict_time' && key)
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
