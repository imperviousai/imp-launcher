import React, { FC, useState, useEffect } from "react";
import { ExclamationCircleIcon } from "@heroicons/react/outline";
import { ipcRenderer } from "electron/renderer";

interface Props {
  sections: number;
  setSections: React.Dispatch<React.SetStateAction<number>>;
}

const Section2: FC<Props> = ({ sections, setSections }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const downloadAssets = () => {
    setIsDownloading(true);
    window.electron.downloadBrowserAndDaemon({
      payload: { browserVersion: "latest", daemonVersion: "latest" },
    });
    // wait until it's finished and then move on
    // setSections(sections + 1);
  };

  const resetDownloadForm = () => {
    setIsDownloading(false);
    setDownloadError("");
  };

  useEffect(() => {
    window.electron.on("all-download-successful", () => {
      setSections(sections + 1);
      setIsDownloading(false);
    });
    window.electron.on("download-error", () => {
      setIsDownloading(false);
      setDownloadError(
        "Unable to download resources. Please check your internet connection or Access Key and try again."
      );
    });
  }, [sections, setSections]);

  return (
    <div>
      <div className="flex flex-col items-center">
        <p className="text-4xl tracking-tight font-extrabold text-gray-900 ">
          Browser Download and Setup
        </p>

        {isDownloading && (
          <div className="mt-3">
            <p className="text-base text-gray-500">
              This can take about a minute.
            </p>
          </div>
        )}

        {!isDownloading && !downloadError && (
          <div className="flex flex-col items-center">
            <p className="mt-3 max-w-lg mx-auto text-base text-gray-500">
              The Impervious Browser utilizes a background daemon that enables
              the browser to connect to the p2p internet. Let's download the
              latest versions of the browser and daemon now.
            </p>
            <div className="flex space-x-4 pt-4">
              <button
                onClick={() => setSections(sections - 1)}
                type="button"
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Go Back
              </button>
              <button
                onClick={() => downloadAssets()}
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Download
              </button>
            </div>
          </div>
        )}

        {downloadError && (
          <div className="max-w-lg">
            <div className="flex flex-col items-center py-4">
              <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
              <p className="text-base text-gray-500 mb-4">{downloadError}</p>
            </div>

            <button
              onClick={() => resetDownloadForm()}
              type="button"
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const Section3: FC<Props> = ({ sections, setSections }) => {
  const closeAndDeploy = () => {
    window.electron.closeAndDeploy();
  };

  return (
    <div>
      <div>
        <p className="text-4xl tracking-tight font-extrabold text-gray-900 ">
          You're ready to rock and roll!
        </p>
        <p className="mt-3 max-w-md mx-auto text-base text-gray-500">
          Everything is setup and ready to go! Just click below to close this
          window and launch the Impervious browser.
        </p>
      </div>

      <div className="pt-4">
        <button
          onClick={() => closeAndDeploy()}
          type="button"
          className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Close & Launch
        </button>
      </div>

      <div className="pt-2">
        <button
          onClick={() => setSections(sections - 1)}
          type="button"
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Go Back
        </button>
      </div>
    </div>
  );
};

const Section1: FC<Props> = ({ sections, setSections }) => {
  return (
    <div>
      <p className="text-4xl tracking-tight font-extrabold text-gray-900 ">
        Welcome to Impervious.ai
      </p>
      <p className="mt-3 max-w-md mx-auto text-base text-gray-500 pb-2">
        Thank you so much for downloading! Welcome to the p2p internet. This
        wizard will guide your through the steps to get all set up.
      </p>
      <button
        onClick={() => setSections(sections + 1)}
        type="button"
        className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Get Started
      </button>
    </div>
  );
};

function HomePage() {
  const [sections, setSections] = useState(0);

  return (
    <div className="h-screen text-center flex flex-col justify-center">
      {sections === 0 && (
        <Section1 sections={sections} setSections={setSections} />
      )}
      {sections === 1 && (
        <Section2 sections={sections} setSections={setSections} />
      )}
      {sections === 2 && (
        <Section3 sections={sections} setSections={setSections} />
      )}
    </div>
  );
}

export default HomePage;