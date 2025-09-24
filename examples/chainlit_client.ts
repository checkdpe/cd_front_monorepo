/* eslint-disable jsx-a11y/heading-has-content */
import { useState, useEffect, useMemo, useRef } from "react";
import { Input, Button } from "antd";
import ReactMarkdown from 'react-markdown';
import { cognitoUserPool } from 'config';
import { getProject } from "services/storages/projectStorage";

import {
  IStep,
  useChatInteract,
  useChatMessages,
  useChatSession,
} from "@chainlit/react-client";

import Avatar from "assets/images/avatar.jpg";
import ChatDPE from "assets/images/chatdpe.png";
import useInsight from "stores/useInsight";

import "styles/insight.scss";

function flattenMessages(
  messages: IStep[],
  condition: (node: IStep) => boolean
): IStep[] {
  return messages.reduce((acc: IStep[], node) => {
    if (condition(node)) {
      acc.push(node);
    }

    if (node.steps?.length) {
      acc.push(...flattenMessages(node.steps, condition));
    }

    return acc;
  }, []);
}

function InsightPage() {
  const [inputValue, setInputValue] = useState("");
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const { sendMessage } = useChatInteract();
  const { messages } = useChatMessages();
  const { connect, disconnect } = useChatSession();
  const { buttonId, reset } = useInsight();

  useEffect(() => {
    return () => {
      reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Connect to the WebSocket server
  useEffect(() => {
    const userInfoAWS = cognitoUserPool.getCurrentUser();
    const email = userInfoAWS?.getUsername() || "";
    const ademeNumber = getProject();

    connect({
      userEnv: {
        /* user environment variables */
        mail: email,
        button_id: buttonId,
        ref_ademe: ademeNumber,
      },
    });

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flatMessages = useMemo(() => {
    return flattenMessages(messages, (m) => m.type.includes("message"));
  }, [messages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop =
        messageContainerRef.current.scrollHeight;
    }
  }, [flatMessages]);

  const handleSendMessage = () => {
    const content = inputValue.trim();
    if (content) {
      const message = {
        name: "user",
        type: "user_message" as const,
        output: content,
      };
      sendMessage(message, []);
      setInputValue("");
    }
  };

  const renderMessage = (message: IStep) => {
    const dateOptions: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
    };
    const date = new Date(message.createdAt).toLocaleTimeString(
      undefined,
      dateOptions
    );

    const containerClass =
      message.type === "assistant_message"
        ? "flex items-start flex-row-reverse"
        : "flex items-start";

    const avatarSrc = message.type === "assistant_message" ? ChatDPE : Avatar;

    return (
      <div key={message.id} className={containerClass}>
        <div className="flex-shrink-0 text-sm text-green-500">
          <img
            src={avatarSrc}
            alt={message.type === "assistant_message" ? "chatdpe" : "avatar"}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full"
          />
        </div>
        <div className="border rounded-lg p-2 bg-white max-w-[calc(100%-3rem)] overflow-hidden">
          <div className="markdown-content overflow-x-auto">
            <ReactMarkdown
              components={{
                p: ({ node, ...props }) => <p className="mb-2" {...props} />,
                h1: ({ node, ...props }) => (
                  <h1 className="text-2xl font-bold mb-2" {...props} />
                ),
                h2: ({ node, ...props }) => (
                  <h2 className="text-xl font-bold mb-2" {...props} />
                ),
                h3: ({ node, ...props }) => (
                  <h3 className="text-lg font-bold mb-2" {...props} />
                ),
                ul: ({ node, ...props }) => (
                  <ul className="list-disc ml-4 mb-2" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal ml-4 mb-2" {...props} />
                ),
                pre: ({ node, ...props }) => (
                  <pre
                    className="bg-gray-100 p-2 rounded mb-2 overflow-x-auto"
                    {...props}
                  />
                ),
                code: ({ node, ...props }) => (
                  <code
                    className="bg-gray-100 px-1 rounded inline-block max-w-full overflow-x-auto"
                    {...props}
                  />
                ),
              }}
            >
              {message.output}
            </ReactMarkdown>
          </div>
          <small className="text-xs text-gray-500">{date}</small>
        </div>
      </div>
    );
  };

  return (
    <div className="energy-insight h-screen flex flex-col">
      <div className="flex-1 overflow-y-auto p-6" ref={messageContainerRef}>
        <div className="space-y-4">
          {flatMessages.map((message) => renderMessage(message))}
        </div>
      </div>
      <div className="border-t p-4 bg-white">
        <div className="flex items-center space-x-2">
          <Input
            autoFocus
            className="flex-1"
            id="message-input"
            placeholder="Ecrire un message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyUp={(e) => {
              if (e.key === "Enter") {
                handleSendMessage();
              }
            }}
          />
          <Button type="primary" onClick={handleSendMessage} htmlType="submit">
            Envoyer
          </Button>
        </div>
      </div>
    </div>
  );
}

export default InsightPage;
