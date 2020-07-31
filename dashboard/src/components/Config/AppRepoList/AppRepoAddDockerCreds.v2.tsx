import React, { useState } from "react";

import actions from "actions";
import { useDispatch } from "react-redux";
import { Action } from "redux";
import { ThunkDispatch } from "redux-thunk";
import { ISecret, IStoreState } from "../../../shared/types";

interface IAppRepoFormProps {
  imagePullSecrets: ISecret[];
  togglePullSecret: (imagePullSecret: string) => () => void;
  selectedImagePullSecrets: { [key: string]: boolean };
  namespace: string;
}

export function AppRepoAddDockerCreds({
  imagePullSecrets,
  togglePullSecret,
  selectedImagePullSecrets,
  namespace,
}: IAppRepoFormProps) {
  const dispatch: ThunkDispatch<IStoreState, null, Action> = useDispatch();
  const [secretName, setSecretName] = useState("");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [server, setServer] = useState("");
  const [showSecretSubForm, setShowSecretSubForm] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleUserChange = (e: React.ChangeEvent<HTMLInputElement>) => setUser(e.target.value);
  const handleSecretNameChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setSecretName(e.target.value);
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setPassword(e.target.value);
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value);
  const handleServerChange = (e: React.ChangeEvent<HTMLInputElement>) => setServer(e.target.value);
  const toggleCredSubForm = () => setShowSecretSubForm(!showSecretSubForm);

  const handleInstallClick = async () => {
    setCreating(true);
    const success = await dispatch(
      actions.repos.createDockerRegistrySecret(
        secretName,
        user,
        password,
        email,
        server,
        namespace,
      ),
    );
    setCreating(false);
    if (success) {
      // re-fetch secrets
      dispatch(actions.repos.fetchImagePullSecrets(namespace));
      setUser("");
      setSecretName("");
      setPassword("");
      setEmail("");
      setServer("");
      setShowSecretSubForm(false);
    }
  };

  return (
    <div>
      {imagePullSecrets.length > 0 ? (
        imagePullSecrets.map(secret => {
          return (
            <div key={secret.metadata.name}>
              <label
                className="checkbox"
                key={secret.metadata.name}
                onChange={togglePullSecret(secret.metadata.name)}
              >
                <input type="checkbox" checked={selectedImagePullSecrets[secret.metadata.name]} />
                <span>{secret.metadata.name}</span>
              </label>
            </div>
          );
        })
      ) : (
        <div>No existing credentials found.</div>
      )}
      {showSecretSubForm && (
        <div className="secondary-input ">
          <div className="row">
            <div className="col-1 margin-t-normal">
              <label htmlFor="kubeapps-docker-cred-secret-name">Secret Name</label>
            </div>
            <div className="col-11">
              <input
                id="kubeapps-docker-cred-secret-name"
                value={secretName}
                onChange={handleSecretNameChange}
                placeholder="Secret"
                required={true}
              />
            </div>
          </div>
          <div className="row">
            <div className="col-1 margin-t-normal">
              <label htmlFor="kubeapps-docker-cred-server">Server</label>
            </div>
            <div className="col-11">
              <input
                id="kubeapps-docker-cred-server"
                value={server}
                onChange={handleServerChange}
                placeholder="https://index.docker.io/v1/"
                required={true}
              />
            </div>
          </div>
          <div className="row">
            <div className="col-1 margin-t-normal">
              <label htmlFor="kubeapps-docker-cred-username">Username</label>
            </div>
            <div className="col-11">
              <input
                id="kubeapps-docker-cred-username"
                value={user}
                onChange={handleUserChange}
                placeholder="Username"
                required={true}
              />
            </div>
          </div>
          <div className="row">
            <div className="col-1 margin-t-normal">
              <label htmlFor="kubeapps-docker-cred-password">Password</label>
            </div>
            <div className="col-11">
              <input
                type="password"
                id="kubeapps-docker-cred-password"
                value={password}
                onChange={handlePasswordChange}
                placeholder="Password"
                required={true}
              />
            </div>
          </div>
          <div className="row">
            <div className="col-1 margin-t-normal">
              <label htmlFor="kubeapps-docker-cred-email">Email</label>
            </div>
            <div className="col-11">
              <input
                id="kubeapps-docker-cred-email"
                value={email}
                onChange={handleEmailChange}
                placeholder="user@example.com"
                required={true}
              />
            </div>
          </div>
          <div>
            <button
              className="button button-primary"
              type="button"
              disabled={creating}
              onClick={handleInstallClick}
            >
              {creating ? "Creating..." : "Submit"}
            </button>
            <button onClick={toggleCredSubForm} type="button" className="button">
              Cancel
            </button>
          </div>
        </div>
      )}
      {!showSecretSubForm && (
        <button onClick={toggleCredSubForm} className="button margin-t-normal" type="button">
          Add new credentials
        </button>
      )}
    </div>
  );
}

export default AppRepoAddDockerCreds;
