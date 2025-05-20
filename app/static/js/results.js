function ResultsPage() {
  const [title, setTitle] = React.useState(null);
  const [results, setResults] = React.useState(null);
  const [enabledModels, setEnabledModels] = React.useState([]);
  const [modalImage, setModalImage] = React.useState(null);
  const [currentRowIndex, setCurrentRowIndex] = React.useState(0);
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const [promptFilter, setPromptFilter] = React.useState('');
  const [hideScores, setHideScores] = React.useState(false);
  const [numColumns, setNumColumns] = React.useState(0);
  const [hasAnyScores, setHasAnyScores] = React.useState(false);

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
    // Read values from URL when component mounts
    const urlParams = new URLSearchParams(window.location.search);
    const filterParam = urlParams.get('filter');
    const hideScoresParam = urlParams.get('hideScores');

    if (filterParam) setPromptFilter(filterParam);
    if (hideScoresParam) setHideScores(hideScoresParam === 'true');

    fetchResults();
  }, []);

  React.useEffect(() => {
    // Update URL when controls change
    const urlParams = new URLSearchParams(window.location.search);

    if (promptFilter) {
      urlParams.set('filter', promptFilter);
    } else {
      urlParams.delete('filter');
    }

    if (hideScores) {
      urlParams.set('hideScores', 'true');
    } else {
      urlParams.delete('hideScores');
    }

    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [promptFilter, hideScores]);

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
        handleResults(data);
      } else {
        console.error('Failed to fetch results');
      }

    } catch (error) {
      console.error('Error fetching results:', error);
    }
  };

  const handleResults = (results) => {
    setNumColumns(getNumColumns(results));

    setTitle(results.title);
    setResults(results.rows);
    setEnabledModels(results.enabled_models || []);

    // Check if any rows have any images with any scores
    const anyScores = results.rows.some(row =>
      row.images.some(image =>
        Object.values(image.scores || {}).some(score => score !== null)
      )
    );
    setHasAnyScores(anyScores);

    if (!results.completed) {
      setTimeout(() => {
        fetchResults();
      }, 5000);  // Poll every 5 seconds
    }
  };

  const selectImage = (imageUrl, rowIndex, imageIndex) => {
    setModalImage(imageUrl);
    if (imageUrl) {
      setCurrentRowIndex(rowIndex);
      setCurrentImageIndex(imageIndex);
    }
  };

  const filterResults = (results) => {
    if (!results) return [];
    return results.filter(row =>
      !promptFilter || (row.prompt && row.prompt.toLowerCase().includes(promptFilter.toLowerCase()))
    );
  };

  React.useEffect(() => {
    fetchResults();
  }, []);

  if (!results) {
    return <LoadingMessage />;
  }

  return (
    <div className="container mx-auto mt-0 p-0 max-w-full">
      <h1 className="text-3xl font-bold mb-6">{title}</h1>
      <div className="mb-4 flex items-center space-x-4 text-gray-500">
        <Controls
          promptFilter={promptFilter}
          setPromptFilter={setPromptFilter}
          hideScores={hideScores}
          setHideScores={setHideScores}
          hasAnyScores={hasAnyScores}
        />
      </div>
      {filterResults(results).map((row, rowIndex) => (
        <ResultRow
          key={rowIndex}
          row={row}
          enabledModels={enabledModels}
          selectImage={selectImage}
          rowIndex={rowIndex}
          hideScores={hideScores}
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

function getNumColumns(results) {
  if (!results || !results.rows || results.rows.length === 0) {
    return 0;
  }

  return Math.max(...results.rows.map(row => row.images.length));
}

function LoadingMessage() {
  return <div className="text-center mt-10">Loading...</div>;
}

function ResultRow({ row, enabledModels, selectImage, rowIndex, hideScores }) {
  return (
    <div className="mb-8 p-4 border-gray-300 border rounded-lg">
      {row.prompt && <Prompt prompt={row.prompt} seed={row.seed} />}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {row.images.map((image, imageIndex) => (
          <ImageCard
            key={imageIndex}
            image={image}
            imageIndex={imageIndex}
            enabledModels={enabledModels}
            selectImage={selectImage}
            rowIndex={rowIndex}
            hideScores={hideScores}
            rowImages={row.images}
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

function ImageCard({ image, imageIndex, enabledModels, selectImage, rowIndex, hideScores, rowImages }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <Image url={image.url} index={imageIndex} onClick={() => selectImage(image.url, rowIndex, imageIndex)} />
      <Labels labels={image.labels} genModel={image.gen_model} genPredictionId={image.gen_prediction_id} />
      {!hideScores && (
        <Scores
          scores={image.scores}
          enabledModels={enabledModels}
          imageIndex={imageIndex}
          rowImages={rowImages}
        />
      )}
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
      <p className="text-sm mb-2">
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
      <p className="text-sm mb-2">
        Prediction loading...
      </p>
    </a>
  );
}

function OtherLabel({ keyName, value }) {
  return (
    <span className="inline-block bg-gray-200 rounded-full px-3 py-1 text-xs font-semibold text-gray-700 mr-2 mb-1">
      {keyName}: {value.toString()}
    </span>
  );
}

function Scores({ scores, enabledModels, imageIndex, rowImages }) {
  return (
    <div>
      {enabledModels.map(model => (
        (model !== "DreamSim" || imageIndex > 0) && (
          <ScoreItem
            key={model}
            model={model}
            score={scores[model]}
            rowImages={rowImages}
          />
        )
      ))}
    </div>
  );
}

function ScoreItem({ model, score, rowImages }) {
  if (score === null) {
    return (
      <p className="text-sm">
        <span className="font-semibold">{model}:</span>{' '}
        processing...
      </p>
    );
  }

  // Get all scores for this model across all images in the row
  const modelScores = rowImages
    .map(image => image.scores[model])
    .filter(s => s !== null);

  const minScore = Math.min(...modelScores);
  const maxScore = Math.max(...modelScores);

  // Calculate color
  let backgroundColor = '#466680'; // Changed to navy blue
  if (maxScore !== minScore) {
    const normalizedScore = (score - minScore) / (maxScore - minScore);
    // Interpolate between navy blue (#466680) and pink (#FF69B4)
    const r = Math.round(70 + (255 - 70) * normalizedScore);
    const g = Math.round(102 + (105 - 102) * normalizedScore);
    const b = Math.round(128 + (180 - 128) * normalizedScore);
    backgroundColor = `rgb(${r}, ${g}, ${b})`;
  }

  return (
    <p className="text-sm">
      <span className="font-semibold">{model}:</span>{' '}
      <span
        className="px-1 rounded text-white"
        style={{ backgroundColor }}
      >
        {score.toFixed(4)}
      </span>
    </p>
  );
}

function Controls({ promptFilter, setPromptFilter, hideScores, setHideScores, hasAnyScores }) {
  return (
    <div>
      <div className="flex items-center space-x-4 mb-3">
        <div className="flex items-center space-x-2">
          <p>Filter by prompt</p>
          <input
            type="text"
            value={promptFilter}
            onChange={(e) => setPromptFilter(e.target.value)}
            className="p-1 border border-gray-300 rounded"
          />
        </div>
        {hasAnyScores && (
          <div className="flex items-center space-x-2">
            <label htmlFor="hideScores" className="text-sm ml-5">Hide scores</label>
            <input
              type="checkbox"
              id="hideScores"
              checked={hideScores}
              onChange={(e) => setHideScores(e.target.checked)}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
          </div>
        )}
      </div>
    </div>
  );
}

ReactDOM.render(<ResultsPage />, document.getElementById('root'));
