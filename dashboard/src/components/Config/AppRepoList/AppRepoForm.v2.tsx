import actions from "actions";
import Alert from "components/js/Alert";
import * as yaml from "js-yaml";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Action } from "redux";
import { ThunkDispatch } from "redux-thunk";
import Hint from "../../../components/Hint";
import { definedNamespaces } from "../../../shared/Namespace";
import { IAppRepository, ISecret, IStoreState } from "../../../shared/types";
import AppRepoAddDockerCreds from "./AppRepoAddDockerCreds.v2";

interface IAppRepoFormProps {
  onSubmit: (
    name: string,
    url: string,
    authHeader: string,
    customCA: string,
    syncJobPodTemplate: string,
    registrySecrets: string[],
  ) => Promise<boolean>;
  onAfterInstall?: () => void;
  namespace: string;
  kubeappsNamespace: string;
  repo?: IAppRepository;
  secret?: ISecret;
}

const AUTH_METHOD_NONE = "none";
const AUTH_METHOD_BASIC = "basic";
const AUTH_METHOD_BEARER = "bearer";
const AUTH_METHOD_CUSTOM = "custom";

export function AppRepoForm({
  onSubmit,
  onAfterInstall,
  namespace,
  kubeappsNamespace,
  repo,
  secret,
}: IAppRepoFormProps) {
  const dispatch: ThunkDispatch<IStoreState, null, Action> = useDispatch();

  const [authMethod, setAuthMethod] = useState(AUTH_METHOD_NONE);
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [authHeader, setAuthHeader] = useState("");
  const [token, setToken] = useState("");
  const [name, setName] = useState("");
  const [url, setURL] = useState("");
  const [customCA, setCustomCA] = useState("");
  const [syncJobPodTemplate, setSyncJobTemplate] = useState("");
  const [selectedImagePullSecrets, setSelectedImagePullSecrets] = useState(
    {} as { [key: string]: boolean },
  );
  const [validated, setValidated] = useState(undefined as undefined | boolean);

  const {
    imagePullSecrets,
    errors: { validate: validationError },
    validating,
  } = useSelector((state: IStoreState) => state.repos);

  useEffect(() => {
    if (repo) {
      setName(repo.metadata.name);
      setURL(repo.spec?.url || "");
      setSyncJobTemplate(
        repo.spec?.syncJobPodTemplate ? yaml.safeDump(repo.spec?.syncJobPodTemplate) : "",
      );
      if (secret) {
        if (secret.data["ca.crt"]) {
          setCustomCA(atob(secret.data["ca.crt"]));
        }
        if (secret.data.authorizationHeader) {
          if (authHeader.startsWith("Basic")) {
            const userPass = atob(authHeader.split(" ")[1]).split(":");
            setUser(userPass[0]);
            setPassword(userPass[1]);
            setAuthMethod(AUTH_METHOD_BASIC);
          } else if (authHeader.startsWith("Bearer")) {
            setToken(authHeader.split(" ")[1]);
            setAuthMethod(AUTH_METHOD_BEARER);
          } else {
            setAuthMethod(AUTH_METHOD_CUSTOM);
            setAuthHeader(atob(secret.data.authorizationHeader));
          }
        }
      }
    }
  }, [repo, secret, authHeader]);

  useEffect(() => {
    // Select the pull secrets based on the current status and if they are already
    // selected in the existing repo info
    const newSelectedImagePullSecrets = { ...selectedImagePullSecrets };
    imagePullSecrets.forEach(pullSecret => {
      let selected = false;
      // If it has been already selected
      if (newSelectedImagePullSecrets[pullSecret.metadata.name]) {
        selected = true;
      }
      // Or if it's already selected in the existing repo
      if (repo?.spec?.dockerRegistrySecrets?.some(s => s === pullSecret.metadata.name)) {
        selected = true;
      }
      newSelectedImagePullSecrets[pullSecret.metadata.name] = selected;
    });
    setSelectedImagePullSecrets(newSelectedImagePullSecrets);
  }, [imagePullSecrets, repo, selectedImagePullSecrets]);

  const handleInstallClick = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    let finalHeader = "";
    switch (authMethod) {
      case AUTH_METHOD_CUSTOM:
        finalHeader = authHeader;
        break;
      case AUTH_METHOD_BASIC:
        finalHeader = `Basic ${btoa(`${user}:${password}`)}`;
        break;
      case AUTH_METHOD_BEARER:
        finalHeader = `Bearer ${token}`;
        break;
    }
    // If the validation already failed and we try to reinstall,
    // skip validation and force install
    const force = validated === false;
    let currentlyValidated = validated;
    if (!validated && !force) {
      currentlyValidated = await dispatch(actions.repos.validateRepo(url, finalHeader, customCA));
      setValidated(currentlyValidated);
    }
    if (currentlyValidated || force) {
      const imagePullSecretsNames = Object.keys(selectedImagePullSecrets).filter(
        s => selectedImagePullSecrets[s],
      );
      const success = await onSubmit(
        name,
        url,
        finalHeader,
        customCA,
        syncJobPodTemplate,
        imagePullSecretsNames,
      );
      if (success && onAfterInstall) {
        await onAfterInstall();
      }
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value);
  const handleURLChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setURL(e.target.value);
    setValidated(undefined);
  };
  const handleAuthHeaderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAuthHeader(e.target.value);
    setValidated(undefined);
  };
  const handleAuthTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setToken(e.target.value);
    setValidated(undefined);
  };
  const handleCustomCAChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCustomCA(e.target.value);
    setValidated(undefined);
  };
  const handleAuthRadioButtonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAuthMethod(e.target.value);
    setValidated(undefined);
  };
  const handleUserChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUser(e.target.value);
    setValidated(undefined);
  };
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setValidated(undefined);
  };
  const handleSyncJobPodTemplateChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSyncJobTemplate(e.target.value);
    setValidated(undefined);
  };

  const togglePullSecret = (imagePullSecret: string) => {
    return () => {
      setSelectedImagePullSecrets({
        ...selectedImagePullSecrets,
        [imagePullSecret]: !selectedImagePullSecrets[imagePullSecret],
      });
    };
  };

  const parseValidationError = (error: Error) => {
    let message = error.message;
    try {
      const parsedMessage = JSON.parse(message);
      if (parsedMessage.code && parsedMessage.message) {
        message = `Code: ${parsedMessage.code}. Message: ${parsedMessage.message}`;
      }
    } catch (e) {
      // Not a json message
    }
    return <Alert>Validation Failed. Got: {message}</Alert>;
  };

  return (
    <form className="container padding-b-bigger" onSubmit={handleInstallClick}>
      <div className="row">
        <div className="col-12">
          <div>
            <h2>Add an App Repository</h2>
          </div>
          <div>
            <label htmlFor="kubeapps-repo-name">Name:</label>
            <input
              type="text"
              id="kubeapps-repo-name"
              placeholder="example"
              value={name}
              onChange={handleNameChange}
              required={true}
              pattern="[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*"
              title="Use lower case alphanumeric characters, '-' or '.'"
              disabled={repo?.metadata.name ? true : false}
            />
          </div>
          <div>
            <label htmlFor="kubeapps-repo-url">URL:</label>
            <input
              type="url"
              id="kubeapps-repo-url"
              placeholder="https://charts.example.com/stable"
              value={url}
              onChange={handleURLChange}
              required={true}
            />
          </div>
          <div>
            <p className="margin-b-small">Repository Authorization (optional):</p>
            <span className="AppRepoInputDescription">
              Introduce the credentials to access the Chart repository if authentication is enabled.
            </span>
            <div className="row">
              <div className="col-2">
                <label className="margin-l-big" htmlFor="kubeapps-repo-auth-method-none">
                  <input
                    type="radio"
                    id="kubeapps-repo-auth-method-none"
                    name="auth"
                    value={AUTH_METHOD_NONE}
                    checked={authMethod === AUTH_METHOD_NONE}
                    onChange={handleAuthRadioButtonChange}
                  />
                  None
                  <br />
                </label>
                <label htmlFor="kubeapps-repo-auth-method-basic">
                  <input
                    type="radio"
                    id="kubeapps-repo-auth-method-basic"
                    name="auth"
                    checked={authMethod === AUTH_METHOD_BASIC}
                    value={AUTH_METHOD_BASIC}
                    onChange={handleAuthRadioButtonChange}
                  />
                  Basic Auth
                  <br />
                </label>
                <label htmlFor="kubeapps-repo-auth-method-bearer">
                  <input
                    type="radio"
                    id="kubeapps-repo-auth-method-bearer"
                    name="auth"
                    value={AUTH_METHOD_BEARER}
                    checked={authMethod === AUTH_METHOD_BEARER}
                    onChange={handleAuthRadioButtonChange}
                  />
                  Bearer Token
                  <br />
                </label>
                <label htmlFor="kubeapps-repo-auth-method-custom">
                  <input
                    type="radio"
                    id="kubeapps-repo-auth-method-custom"
                    name="auth"
                    value={AUTH_METHOD_CUSTOM}
                    checked={authMethod === AUTH_METHOD_CUSTOM}
                    onChange={handleAuthRadioButtonChange}
                  />
                  Custom
                  <br />
                </label>
              </div>
              <div className="col-10" aria-live="polite">
                <div hidden={authMethod !== AUTH_METHOD_BASIC} className="secondary-input">
                  <label htmlFor="kubeapps-repo-username">Username</label>
                  <input
                    type="text"
                    id="kubeapps-repo-username"
                    value={user}
                    onChange={handleUserChange}
                    placeholder="Username"
                  />
                  <label htmlFor="kubeapps-repo-password">Password</label>
                  <input
                    type="password"
                    id="kubeapps-repo-password"
                    value={password}
                    onChange={handlePasswordChange}
                    placeholder="Password"
                  />
                </div>
                <div hidden={authMethod !== AUTH_METHOD_BEARER} className="secondary-input">
                  <label htmlFor="kubeapps-repo-token">Token</label>
                  <input
                    id="kubeapps-repo-token"
                    type="text"
                    value={token}
                    onChange={handleAuthTokenChange}
                  />
                </div>
                <div hidden={authMethod !== AUTH_METHOD_CUSTOM} className="secondary-input">
                  <label htmlFor="kubeapps-repo-custom-header">Complete Authorization Header</label>
                  <input
                    type="text"
                    id="kubeapps-repo-custom-header"
                    placeholder="Bearer xrxNcWghpRLdcPHFgVRM73rr4N7qjvjm"
                    value={authHeader}
                    onChange={handleAuthHeaderChange}
                  />
                </div>
              </div>
            </div>
          </div>
          {/* Only when using a namespace different than the Kubeapps namespace (Global)
              the repository can be associated with Docker Registry Credentials since
              the pull secret won't be available in all namespaces */
          namespace !== kubeappsNamespace && (
            <div>
              <p className="margin-b-small">Associate Docker Registry Credentials (optional):</p>
              <span className="AppRepoInputDescription">
                Select existing secret(s) to access a private Docker registry and pull images from
                it. Note that this functionality is supported for Kubeapps with Helm3 only, more
                info{" "}
                <a
                  href="https://github.com/kubeapps/kubeapps/blob/master/docs/user/private-app-repository.md"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  here
                </a>
                .
                <AppRepoAddDockerCreds
                  imagePullSecrets={imagePullSecrets}
                  togglePullSecret={togglePullSecret}
                  selectedImagePullSecrets={selectedImagePullSecrets}
                  namespace={namespace}
                />
              </span>
            </div>
          )}
          <div className="margin-t-big">
            <label>
              <span>Custom CA Certificate (optional):</span>
              <pre className="CodeContainer">
                <textarea
                  className="Code"
                  rows={4}
                  placeholder={"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"}
                  value={customCA}
                  onChange={handleCustomCAChange}
                />
              </pre>
            </label>
          </div>
          <div>
            <label htmlFor="syncJobPodTemplate">Custom Sync Job Template (optional)</label>
            <Hint reactTooltipOpts={{ delayHide: 1000 }} id="syncJobHelp">
              <span>
                It's possible to modify the default sync job. More info{" "}
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://github.com/kubeapps/kubeapps/blob/master/docs/user/private-app-repository.md#modifying-the-synchronization-job"
                >
                  here
                </a>
                <br />
                When modifying the default sync job, the pre-validation is not supported.
              </span>
            </Hint>
            <pre className="CodeContainer">
              <textarea
                id="syncJobPodTemplate"
                className="Code"
                rows={4}
                placeholder={
                  "spec:\n" +
                  "  containers:\n" +
                  "  - env:\n" +
                  "    - name: FOO\n" +
                  "      value: BAR\n"
                }
                value={syncJobPodTemplate}
                onChange={handleSyncJobPodTemplateChange}
              />
            </pre>
          </div>
          {(namespace === kubeappsNamespace || namespace === definedNamespaces.all) && (
            <div className="margin-b-normal">
              <strong>NOTE:</strong> This App Repository will be created in the "{kubeappsNamespace}
              " namespace and charts will be available in all namespaces for installation.
            </div>
          )}
          {validationError && parseValidationError(validationError)}
          <div>
            <button className="button button-primary" type="submit" disabled={validating}>
              {validating
                ? "Validating..."
                : `${repo ? "Update" : "Install"} Repo ${validated === false ? "(force)" : ""}`}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
