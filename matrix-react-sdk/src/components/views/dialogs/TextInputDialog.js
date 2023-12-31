/*
Copyright 2015, 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import React, { createRef } from 'react';
import PropTypes from 'prop-types';
import * as sdk from '../../../index';
import Field from "../elements/Field";
import { _t, _td } from '../../../languageHandler';
import { replaceableComponent } from "../../../utils/replaceableComponent";
import AccessibleButton from '../elements/AccessibleButton';
import classNames from 'classnames';
import { GiphyFetch } from '@giphy/js-fetch-api'

const gf = new GiphyFetch('F1aglZGQRVhG47vVNNvOjxMjS6Tct3zZ')

@replaceableComponent("views.dialogs.TextInputDialog")
export default class TextInputDialog extends React.Component {
    static propTypes = {
        title: PropTypes.string,
        description: PropTypes.oneOfType([
            PropTypes.element,
            PropTypes.string,
        ]),
        value: PropTypes.string,
        placeholder: PropTypes.string,
        button: PropTypes.string,
        busyMessage: PropTypes.string, // pass _td string
        focus: PropTypes.bool,
        onFinished: PropTypes.func.isRequired,
        hasCancel: PropTypes.bool,
        validator: PropTypes.func, // result of withValidation
        fixedWidth: PropTypes.bool,
        disableTextArea: PropTypes.bool,
        className: PropTypes.string,
    };

    static defaultProps = {
        title: "",
        value: "",
        description: "",
        busyMessage: _td("Loading..."),
        focus: true,
        hasCancel: true,
    };

    constructor(props) {
        super(props);

        this._field = createRef();

        this.state = {
            value: this.props.value,
            busy: false,
            valid: false,
            isGif: false,
            gifImage: null,
            gifError: false
        };
    }

    componentDidMount() {
        if (this.props.focus && !this.props.disableTextArea) {
            // Set the cursor at the end of the text input
            // this._field.current.value = this.props.value;
            this._field.current.focus();
        }

        if (this.isGIF(this.props.description)){
            this.setState({ isGif: true })
            const gifId = this.extractGifId(this.props.description);
            this.fetchGifs(gifId);
        }
    }

    onOk = async ev => {
        ev.preventDefault();
        if (this.props.validator) {
            this.setState({ busy: true });
            await this._field.current.validate({ allowEmpty: false });

            if (!this._field.current.state.valid) {
                this._field.current.focus();
                this._field.current.validate({ allowEmpty: false, focused: true });
                this.setState({ busy: false });
                return;
            }
        }
        this.props.onFinished(true, this.state.value);
    };

    onCancel = () => {
        this.props.onFinished(false);
    };

    onChange = ev => {
        this.setState({
            value: ev.target.value,
        });
    };

    onValidate = async fieldState => {
        const result = await this.props.validator(fieldState);
        this.setState({
            valid: result.valid,
        });
        return result;
    };

    isGIF = (message) => {
        return message.startsWith('<gif>') && message.endsWith('</gif>');
    }

    extractGifId(message) {
        return message.replace('<gif>', '').replace('</gif>', '')
    }

    fetchGifs = async (gifId) => {
        try {
            const { data } = await gf.gif(gifId);
            this.setState({ gifImage: data })
        } catch {
            this.setState({ gifError: true })
        }
    }

    render() {
        const BaseDialog = sdk.getComponent('views.dialogs.BaseDialog');
        const DialogButtons = sdk.getComponent('views.elements.DialogButtons');
        const className = classNames("mx_TextInputDialog", this.props.className);

        return (
            <BaseDialog
                className={className}
                onFinished={this.props.onFinished}
                title={this.props.title}
                fixedWidth={this.props.fixedWidth}
            >
                <form onSubmit={this.onOk}>
                    <div className="mx_Dialog_content">
                        <div className="mx_TextInputDialog_label" style={this.state.isGif ? { textAlign: 'center' } : {}}>
                            <label htmlFor="textinput">
                                { this.state.isGif ?
                                    (this.state.gifImage ?
                                        <img src={ this.state.gifImage.images.original.url } alt="image.png" style={{ maxWidth: '330px', maxHeight: '300px' }} />
                                    : (this.state.gifError ?
                                        'Something went wrong while loading your GIF.'
                                        : 'Loading GIF..'))
                                : this.props.description }
                            </label>
                        </div>
                        {
                            !this.props.disableTextArea
                            ?
                            <div>
                                <Field
                                    className="mx_TextInputDialog_input"
                                    ref={this._field}
                                    type="text"
                                    label={this.props.placeholder}
                                    value={this.state.value}
                                    onChange={this.onChange}
                                    onValidate={this.props.validator ? this.onValidate : undefined}
                                    size="64"
                                />
                            </div>
                            :
                            <React.Fragment></React.Fragment>
                        }
                    </div>
                </form>
                <DialogButtons
                    primaryButton={this.state.busy ? _t(this.props.busyMessage) : this.props.button}
                    disabled={this.state.busy}
                    onPrimaryButtonClick={this.onOk}
                    onCancel={this.onCancel}
                    hasCancel={this.props.hasCancel}
                />
            </BaseDialog>
        );
    }
}
