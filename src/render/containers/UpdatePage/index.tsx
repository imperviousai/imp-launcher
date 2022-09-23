import React, { FC, useState, useEffect } from "react";
import { ExclamationCircleIcon } from "@heroicons/react/outline";
import { ipcRenderer } from "electron/renderer";


const UpdateSection: FC= () => {
    return (
      <div>
        <p className="text-4xl tracking-tight font-extrabold text-gray-900 ">
          Updating Impervious.ai
        </p>
        <p className="mt-3 max-w-md mx-auto text-base text-gray-500 pb-2">
          Downloading a daemon update...
          This shouldn't take too long.
        </p>
      </div>
    );
  };


function UpdatePage() {
  
    return (
      <div className="h-screen text-center flex flex-col justify-center">
          <UpdateSection/>
      </div>
    );
  }

export default UpdatePage;